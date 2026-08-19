import { supabase } from '@/lib/supabase';
import { parseMoney } from '../lib/format';
import type {
  PosCatalogProduct,
  PosPaymentMethod,
  PosSaleItemRow,
  PosSaleRow,
  PosSaleStatus,
} from '../types';

export type CompletePosSaleInput = {
  saleNumber: string;
  warehouseId: string;
  customerId?: string | null;
  customerName: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paymentMethod: PosPaymentMethod;
  amountTendered: number;
  changeDue: number;
  notes?: string;
  items: Array<{
    productId: string;
    sku: string;
    name: string;
    unitPrice: number;
    quantity: number;
    lineDiscount?: number;
    lineTotal: number;
    color?: string | null;
    size?: string | null;
  }>;
};

type PosSaleDbRow = {
  id: string;
  sale_number: string;
  warehouse_id: string;
  customer_id: string | null;
  customer_name: string;
  subtotal: number | string;
  discount_amount: number | string;
  tax_amount: number | string;
  total: number | string;
  payment_method: string;
  amount_tendered: number | string;
  change_due: number | string;
  notes: string | null;
  status: string;
  created_at: string;
  warehouse?: { id: string; name: string; code: string } | null;
  items?: PosSaleItemDbRow[];
};

type PosSaleItemDbRow = {
  id: string;
  sale_id: string;
  product_id: string | null;
  sku: string;
  name: string;
  unit_price: number | string;
  quantity: number;
  line_discount: number | string;
  line_total: number | string;
  color: string | null;
  size: string | null;
};

function requireClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  return supabase;
}

function mapItem(row: PosSaleItemDbRow): PosSaleItemRow {
  return {
    id: row.id,
    saleId: row.sale_id,
    productId: row.product_id,
    sku: row.sku,
    name: row.name,
    unitPrice: parseMoney(row.unit_price),
    quantity: row.quantity,
    lineDiscount: parseMoney(row.line_discount),
    lineTotal: parseMoney(row.line_total),
    color: row.color,
    size: row.size,
  };
}

function mapSale(row: PosSaleDbRow): PosSaleRow {
  const items = (row.items ?? []).map(mapItem);
  return {
    id: row.id,
    saleNumber: row.sale_number,
    warehouseId: row.warehouse_id,
    warehouseName: row.warehouse?.name ?? '',
    warehouseCode: row.warehouse?.code ?? '',
    customerId: row.customer_id,
    customerName: row.customer_name,
    subtotal: parseMoney(row.subtotal),
    discountAmount: parseMoney(row.discount_amount),
    taxAmount: parseMoney(row.tax_amount),
    total: parseMoney(row.total),
    paymentMethod: (row.payment_method as PosPaymentMethod) ?? 'cash',
    amountTendered: parseMoney(row.amount_tendered),
    changeDue: parseMoney(row.change_due),
    notes: row.notes,
    status: (row.status as PosSaleStatus) ?? 'completed',
    itemCount: items.length,
    createdAt: row.created_at,
    items,
  };
}

export async function fetchPosCatalog(warehouseId: string): Promise<PosCatalogProduct[]> {
  const client = requireClient();
  const { data: products, error } = await client
    .from('inventory_products')
    .select('id, name, sku, barcode, image, price, status')
    .eq('status', 'Live')
    .order('name');
  if (error) throw error;

  const { data: stockRows, error: stockError } = await client
    .from('inventory_warehouse_stock')
    .select('product_id, qty')
    .eq('warehouse_id', warehouseId);
  if (stockError) throw stockError;

  const qtyByProduct = new Map((stockRows ?? []).map((row) => [row.product_id as string, Number(row.qty ?? 0)]));
  return ((products ?? []) as Array<{
    id: string;
    name: string;
    sku: string;
    barcode: string | null;
    image: string | null;
    price: number | string;
    status: string;
  }>).map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode ?? '',
    image: product.image ?? '11.png',
    price: parseMoney(product.price),
    status: product.status,
    qty: qtyByProduct.get(product.id) ?? 0,
  }));
}

export async function fetchPosSales() {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_pos_sales')
    .select('*, warehouse:inventory_warehouses(id, name, code), items:inventory_pos_sale_items(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as PosSaleDbRow[]).map(mapSale);
}

export async function fetchPosSaleById(id: string) {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_pos_sales')
    .select('*, warehouse:inventory_warehouses(id, name, code), items:inventory_pos_sale_items(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapSale(data as PosSaleDbRow);
}

export async function completePosSale(input: CompletePosSaleInput) {
  const client = requireClient();
  const saleId = crypto.randomUUID();
  const { data, error } = await client.rpc('inventory_complete_pos_sale', {
    payload: {
      sale_id: saleId,
      sale_number: input.saleNumber,
      warehouse_id: input.warehouseId,
      customer_id: input.customerId ?? null,
      customer_name: input.customerName,
      subtotal: input.subtotal,
      discount_amount: input.discountAmount,
      tax_amount: input.taxAmount,
      total: input.total,
      payment_method: input.paymentMethod,
      amount_tendered: input.amountTendered,
      change_due: input.changeDue,
      notes: input.notes ?? '',
      items: input.items.map((item) => ({
        product_id: item.productId,
        sku: item.sku,
        name: item.name,
        unit_price: item.unitPrice,
        quantity: item.quantity,
        line_discount: item.lineDiscount ?? 0,
        line_total: item.lineTotal,
        color: item.color ?? '',
        size: item.size ?? '',
      })),
    },
  });
  if (error) throw error;
  const returnedId = (data as { id?: string } | null)?.id ?? saleId;
  return fetchPosSaleById(returnedId);
}

export async function voidPosSale(saleId: string) {
  const client = requireClient();
  const { error } = await client.rpc('inventory_void_pos_sale', {
    p_sale_id: saleId,
  });
  if (error) throw error;
  return saleId;
}

export function computePosTotals(options: {
  items: Array<{ unitPrice: number; quantity: number; lineDiscount?: number }>;
  discountAmount?: number;
  discountPercent?: number;
  taxPercent: number;
  taxCalculation: string;
}) {
  const lineSubtotal = options.items.reduce((sum, item) => {
    const line = item.unitPrice * item.quantity - (item.lineDiscount ?? 0);
    return sum + Math.max(line, 0);
  }, 0);
  const percentDiscount = options.discountPercent
    ? (lineSubtotal * options.discountPercent) / 100
    : 0;
  const discountAmount = Math.min(lineSubtotal, Math.max(options.discountAmount ?? 0, 0) + percentDiscount);
  const afterDiscount = Math.max(lineSubtotal - discountAmount, 0);
  const taxPercent = Math.max(options.taxPercent, 0);
  const inclusive = options.taxCalculation === 'inclusive';
  const taxAmount = inclusive
    ? afterDiscount - afterDiscount / (1 + taxPercent / 100)
    : (afterDiscount * taxPercent) / 100;
  const total = inclusive ? afterDiscount : afterDiscount + taxAmount;
  return {
    subtotal: roundMoney(lineSubtotal),
    discountAmount: roundMoney(discountAmount),
    taxAmount: roundMoney(taxAmount),
    total: roundMoney(total),
  };
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

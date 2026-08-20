import { supabase } from '@/lib/supabase';
import { parseMoney, roundMoney } from '../lib/format';
import type {
  PosCatalogProduct,
  PosPaymentMethod,
  PosSaleItemRow,
  PosSaleRow,
  PosSaleStatus,
} from '../types';

/** Default void window (days); must match inventory_void_pos_sale default. */
export const POS_VOID_MAX_AGE_DAYS = 30;

export type CompletePosSaleInput = {
  saleId?: string;
  saleNumber: string;
  warehouseId?: string | null;
  customerId?: string | null;
  customerName: string;
  subtotal: number;
  discountAmount: number;
  discountPercent?: number;
  taxAmount: number;
  taxPercent?: number;
  taxCalculation?: string;
  total: number;
  paymentMethod: PosPaymentMethod;
  amountTendered: number;
  changeDue: number;
  notes?: string;
  items: Array<{
    productId: string;
    warehouseId: string;
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
  warehouse_id: string | null;
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
  tax_percent?: number | string | null;
  tax_calculation?: string | null;
  void_reason?: string | null;
  voided_at?: string | null;
  created_at: string;
  warehouse?: { id: string; name: string; code: string } | null;
  items?: PosSaleItemDbRow[];
};

type PosSaleItemDbRow = {
  id: string;
  sale_id: string;
  product_id: string | null;
  warehouse_id?: string | null;
  sku: string;
  name: string;
  unit_price: number | string;
  quantity: number;
  line_discount: number | string;
  line_total: number | string;
  color: string | null;
  size: string | null;
  warehouse?: { id: string; name: string; code: string } | null;
};

function requireClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  return supabase;
}

function mapItem(row: PosSaleItemDbRow, saleWarehouse?: { id: string; name: string; code: string } | null): PosSaleItemRow {
  return {
    id: row.id,
    saleId: row.sale_id,
    productId: row.product_id,
    warehouseId: row.warehouse?.id ?? row.warehouse_id ?? saleWarehouse?.id ?? '',
    warehouseName: row.warehouse?.name ?? saleWarehouse?.name ?? '',
    warehouseCode: row.warehouse?.code ?? saleWarehouse?.code ?? '',
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

export function uniqueSaleWarehouses(sale: PosSaleRow): Array<{ id: string; name: string; code: string }> {
  const seen = new Map<string, { id: string; name: string; code: string }>();
  for (const item of sale.items ?? []) {
    if (!item.warehouseId || seen.has(item.warehouseId)) continue;
    seen.set(item.warehouseId, {
      id: item.warehouseId,
      name: item.warehouseName || sale.warehouseName,
      code: item.warehouseCode || sale.warehouseCode,
    });
  }
  if (!seen.size && sale.warehouseId) {
    seen.set(sale.warehouseId, {
      id: sale.warehouseId,
      name: sale.warehouseName,
      code: sale.warehouseCode,
    });
  }
  return [...seen.values()];
}

export function formatSaleWarehouses(sale: PosSaleRow): string {
  const warehouses = uniqueSaleWarehouses(sale);
  if (!warehouses.length) return 'Multiple warehouses';
  return warehouses
    .map((row) => (row.code ? `${row.name} (${row.code})` : row.name))
    .join(', ');
}

export function groupSaleItemsByWarehouse(sale: PosSaleRow) {
  const groups: Array<{
    id: string;
    name: string;
    code: string;
    items: NonNullable<PosSaleRow['items']>;
  }> = [];
  const indexById = new Map<string, number>();

  for (const item of sale.items ?? []) {
    const id = item.warehouseId || sale.warehouseId || 'unknown';
    const existing = indexById.get(id);
    if (existing == null) {
      indexById.set(id, groups.length);
      groups.push({
        id,
        name: item.warehouseName || sale.warehouseName || 'Warehouse',
        code: item.warehouseCode || sale.warehouseCode || '',
        items: [item],
      });
      continue;
    }
    groups[existing].items.push(item);
  }

  if (!groups.length && sale.warehouseId) {
    groups.push({
      id: sale.warehouseId,
      name: sale.warehouseName,
      code: sale.warehouseCode,
      items: [],
    });
  }

  return groups;
}

function mapSale(row: PosSaleDbRow): PosSaleRow {
  const items = (row.items ?? []).map((item) => mapItem(item, row.warehouse));
  return {
    id: row.id,
    saleNumber: row.sale_number,
    warehouseId: row.warehouse_id ?? row.warehouse?.id ?? items[0]?.warehouseId ?? '',
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
    taxPercent: row.tax_percent == null ? null : parseMoney(row.tax_percent),
    taxCalculation: row.tax_calculation ?? null,
    voidReason: row.void_reason ?? null,
    voidedAt: row.voided_at ?? null,
    itemCount: items.length,
    createdAt: row.created_at,
    items,
  };
}

export function formatPosError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
  const lower = message.toLowerCase();
  if (lower.includes('insufficient available stock') || lower.includes('insufficient stock')) {
    return 'Not enough available stock for one or more items';
  }
  if (lower.includes('insufficient account balance')) {
    return 'Not enough account balance for this sale';
  }
  if (lower.includes('amount tendered')) {
    return 'Amount tendered is less than the total';
  }
  if (lower.includes('sale total mismatch')) {
    return 'Sale totals changed — refresh the cart and try again';
  }
  if (lower.includes('older than') && lower.includes('void')) {
    return `Sales older than ${POS_VOID_MAX_AGE_DAYS} days cannot be voided`;
  }
  if (lower.includes('already voided')) {
    return 'Sale is already voided';
  }
  if (lower.includes('not sellable') || lower.includes('not live')) {
    return 'A cart product is no longer available for sale';
  }
  if (lower.includes('must include a product')) {
    return 'Each sale item must include a product';
  }
  if (lower.includes('require a customer')) {
    return 'Select a customer for account or credit sales';
  }
  return message;
}

export async function fetchPosCatalog(warehouseId?: string | null): Promise<PosCatalogProduct[]> {
  const client = requireClient();
  const { data: products, error } = await client
    .from('inventory_products')
    .select('id, name, sku, barcode, image, price, status')
    .eq('status', 'Live')
    .is('deleted_at', null)
    .order('name');
  if (error) throw error;

  let stockQuery = client
    .from('inventory_warehouse_stock')
    .select('product_id, qty, reserved, warehouse:inventory_warehouses(id, name, code, status)');
  if (warehouseId) {
    stockQuery = stockQuery.eq('warehouse_id', warehouseId);
  }
  const { data: stockRows, error: stockError } = await stockQuery;
  if (stockError) throw stockError;

  const productById = new Map(
    ((products ?? []) as Array<{
      id: string;
      name: string;
      sku: string;
      barcode: string | null;
      image: string | null;
      price: number | string;
      status: string;
    }>).map((product) => [product.id, product]),
  );

  return ((stockRows ?? []) as Array<{
    product_id: string;
    qty: number | string;
    reserved?: number | string;
    warehouse?:
      | { id: string; name: string; code: string; status?: string }
      | { id: string; name: string; code: string; status?: string }[]
      | null;
  }>)
    .flatMap((row) => {
      const product = productById.get(row.product_id);
      const warehouse = Array.isArray(row.warehouse) ? row.warehouse[0] : row.warehouse;
      if (!product || !warehouse) return [];
      if ((warehouse.status ?? '').toLowerCase() !== 'active') return [];
      const qty = Number(row.qty ?? 0);
      const reserved = Number(row.reserved ?? 0);
      const available = Math.max(qty - reserved, 0);
      if (available <= 0) return [];
      return [{
        id: product.id,
        warehouseId: warehouse.id,
        warehouseName: warehouse.name,
        warehouseCode: warehouse.code,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode ?? '',
        image: product.image ?? '11.png',
        price: parseMoney(product.price),
        status: product.status,
        qty: available,
      }];
    })
    .sort((a, b) => a.name.localeCompare(b.name) || a.warehouseName.localeCompare(b.warehouseName));
}

export async function fetchPosSales() {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_pos_sales')
    .select('*, warehouse:inventory_warehouses(id, name, code), items:inventory_pos_sale_items(*, warehouse:inventory_warehouses(id, name, code))')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as PosSaleDbRow[]).map(mapSale);
}

export async function fetchPosSaleById(id: string) {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_pos_sales')
    .select('*, warehouse:inventory_warehouses(id, name, code), items:inventory_pos_sale_items(*, warehouse:inventory_warehouses(id, name, code))')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapSale(data as PosSaleDbRow);
}

export async function completePosSale(input: CompletePosSaleInput) {
  const client = requireClient();
  const saleId = input.saleId ?? crypto.randomUUID();
  const { data, error } = await client.rpc('inventory_complete_pos_sale', {
    payload: {
      sale_id: saleId,
      sale_number: input.saleNumber,
      warehouse_id: input.warehouseId ?? null,
      customer_id: input.customerId ?? null,
      customer_name: input.customerName,
      subtotal: input.subtotal,
      discount_amount: input.discountAmount,
      discount_percent: input.discountPercent ?? 0,
      tax_amount: input.taxAmount,
      tax_percent: input.taxPercent ?? null,
      tax_calculation: input.taxCalculation ?? null,
      total: input.total,
      payment_method: input.paymentMethod,
      amount_tendered: input.amountTendered,
      change_due: input.changeDue,
      notes: input.notes ?? '',
      items: input.items.map((item) => ({
        product_id: item.productId,
        warehouse_id: item.warehouseId,
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

export async function voidPosSale(
  saleId: string,
  options?: { reason?: string; maxAgeDays?: number },
) {
  const client = requireClient();
  const { error } = await client.rpc('inventory_void_pos_sale', {
    p_sale_id: saleId,
    p_void_reason: options?.reason ?? null,
    p_max_age_days: options?.maxAgeDays ?? POS_VOID_MAX_AGE_DAYS,
  });
  if (error) throw error;
  return saleId;
}

export function isPosSaleVoidable(sale: Pick<PosSaleRow, 'status' | 'createdAt'>, maxAgeDays = POS_VOID_MAX_AGE_DAYS) {
  if (sale.status !== 'completed') return false;
  if (maxAgeDays < 0) return true;
  const created = new Date(sale.createdAt).getTime();
  if (Number.isNaN(created)) return false;
  const ageMs = Date.now() - created;
  return ageMs <= maxAgeDays * 24 * 60 * 60 * 1000;
}

export function computePosTotals(options: {
  items: Array<{ unitPrice: number; quantity: number; lineDiscount?: number }>;
  discountAmount?: number;
  discountPercent?: number;
  taxPercent: number;
  taxCalculation: string;
}) {
  const lineSubtotal = options.items.reduce((sum, item) => {
    const line = roundMoney(item.unitPrice) * item.quantity - roundMoney(item.lineDiscount ?? 0);
    return sum + Math.max(line, 0);
  }, 0);
  const clampedPercent = Math.min(Math.max(options.discountPercent ?? 0, 0), 100);
  const percentDiscount = clampedPercent ? (lineSubtotal * clampedPercent) / 100 : 0;
  const fixedDiscount = Math.max(options.discountAmount ?? 0, 0);
  const discountAmount = roundMoney(Math.min(lineSubtotal, fixedDiscount + percentDiscount));
  const afterDiscount = Math.max(lineSubtotal - discountAmount, 0);
  const taxPercent = Math.max(options.taxPercent, 0);
  const inclusive = options.taxCalculation === 'inclusive';
  const taxAmount = roundMoney(
    inclusive
      ? afterDiscount - afterDiscount / (1 + taxPercent / 100)
      : (afterDiscount * taxPercent) / 100,
  );
  const total = inclusive ? afterDiscount : afterDiscount + taxAmount;
  return {
    subtotal: roundMoney(lineSubtotal),
    discountAmount,
    taxAmount,
    total: roundMoney(total),
  };
}

/** Split a cart-level discount across lines so line totals reconcile with the receipt. */
export function allocateCartDiscount(
  items: Array<{ unitPrice: number; quantity: number }>,
  discountAmount: number,
) {
  const grosses = items.map((item) => roundMoney(item.unitPrice) * item.quantity);
  const totalGross = grosses.reduce((sum, value) => sum + value, 0);
  const clampedDiscount = roundMoney(Math.min(Math.max(discountAmount, 0), totalGross));
  if (totalGross <= 0 || clampedDiscount <= 0) {
    return items.map((item, index) => ({
      lineDiscount: 0,
      lineTotal: grosses[index],
    }));
  }

  let allocated = 0;
  return grosses.map((gross, index) => {
    const isLast = index === grosses.length - 1;
    const share = isLast
      ? roundMoney(clampedDiscount - allocated)
      : roundMoney((gross / totalGross) * clampedDiscount);
    allocated += share;
    return {
      lineDiscount: share,
      lineTotal: roundMoney(gross - share),
    };
  });
}

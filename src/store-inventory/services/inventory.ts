import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import {
  parseStockEntryQty,
  parseStockEntryRpcQty,
  stockEntryLineTotal,
  type StockEntryType,
} from '../lib/stock-entry';
import { buildOrderDetail } from '../data/orders';
import {
  assertNonNegativeMoney,
  assertNonNegativeQty,
  formatMoney,
  generateCustomerCode,
  generateOrderNumber,
  parseMoney,
  parseQty,
  stableId,
} from '../lib/format';
import { mapOrderError } from '../lib/order-errors';
import { computeOrderPricing } from '../lib/order-pricing';
import {
  isCanceledDelivery,
  normalizeDeliveryStatus,
  normalizePaymentStatus,
} from '../lib/order-status';
import { mapCategoryError } from '../lib/category-errors';
import {
  generateCategoryCode,
  normalizeCategoryName,
  normalizeCategoryStatus,
  parseCategoryInput,
} from '../lib/category-validation';
import {
  defaultCustomerReviews,
  defaultPaymentMethods,
  locationProfile,
  withCustomerProfile,
} from '../data/customer-profile';
import type {
  AllStockRow,
  CategoryListRow,
  CurrentStockRow,
  CustomerListRow,
  CustomerPaymentMethod,
  CustomerReviewGroup,
  DetailsInvoiceRow,
  DetailsOrdersRow,
  InboundStockRow,
  OrderDetailRow,
  OrderItemRow,
  OrderListRow,
  OrderTrackingEventRow,
  OutboundStockRow,
  ProductListRow,
  ProductOptionCard,
  ProductVariantRow,
  StockPlannerRow,
} from '../types';
import { ZodError } from 'zod';

export type InventoryCategory = {
  id: string;
  name: string;
  code: string | null;
  icon: string | null;
  status: string;
  featured: boolean;
  description: string | null;
  total_earnings: number | string;
  created_at: string;
  updated_at: string;
  products?: { count: number }[];
};

export type InventorySupplier = {
  id: string;
  name: string;
  logo: string | null;
};

export type InventoryWarehouse = {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  status?: string;
  is_default?: boolean;
};

export type InventoryCarrier = {
  id: string;
  name: string;
  logo: string | null;
};

export type InventoryBrand = {
  id: string;
  name: string;
};

export type InventoryStockLevel = {
  id: string;
  product_id: string;
  qty: number;
  reserved: number;
  threshold: number;
  inbound_qty: number;
  outbound_qty: number;
  delta_label: string;
  delta_variant: string;
  total_value: number | string;
  last_moved: string | null;
  handler: string | null;
  trend_label: string;
  trend_variant: string;
  flow_rate: number | string;
  reorder_qty: number;
  reorder_in_days: number;
  reorder_date: string | null;
  lead_time_days: number;
  lead_time_date: string | null;
  auto_reorder: boolean;
};

export type InventoryProduct = {
  id: string;
  sku: string;
  name: string;
  full_name: string | null;
  description: string | null;
  barcode: string | null;
  image: string | null;
  price: number | string;
  status: string;
  featured: boolean;
  tags: string[];
  category_id: string | null;
  brand_id: string | null;
  supplier_id: string | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
  category?: InventoryCategory | null;
  brand?: InventoryBrand | null;
  supplier?: InventorySupplier | null;
  stock_level?: InventoryStockLevel | null;
};

export type ProductDeleteImpact = {
  id: string;
  sku: string;
  name: string;
  deleted_at: string | null;
  variants: number;
  options: number;
  warehouse_stock: number;
  inbound_shipments: number;
  outbound_shipments: number;
  order_items: number;
  pos_sale_items: number;
  stock_movements: number;
  can_hard_delete: boolean;
};

export type CustomerDeleteImpact = {
  id: string;
  code: string;
  name: string;
  account_balance: number;
  deleted_at: string | null;
  ledger_count: number;
  pos_sales_count: number;
  orders_count: number;
  can_hard_delete: boolean;
};

export type InventoryProfileName = {
  id?: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

export type InventoryInboundShipment = {
  id: string;
  product_id: string;
  warehouse_id?: string | null;
  order_date: string;
  qty: number;
  stock_value: number | string;
  status: string;
  status_variant: string;
  arrival_date: string;
  created_at?: string;
  created_by?: string | null;
  received_by_name?: string | null;
  product?: InventoryProduct | null;
  supplier?: InventorySupplier | null;
  carrier?: InventoryCarrier | null;
  warehouse?: InventoryWarehouse | null;
  receiver?: InventoryProfileName | null;
};

export type InventoryOutboundShipment = {
  id: string;
  product_id: string;
  order_ref: string;
  qty: number;
  status: string;
  status_variant: string;
  expected_delivery: string;
  notify: boolean;
  warehouse_id?: string | null;
  product?: InventoryProduct | null;
  warehouse?: InventoryWarehouse | null;
  carrier?: InventoryCarrier | null;
};

export type InventoryCustomer = {
  id: string;
  code: string;
  name: string;
  email: string | null;
  image: string | null;
  phone: string | null;
  company: string | null;
  timezone: string | null;
  billing_address: string | null;
  vat_id: string | null;
  location_name: string | null;
  location_flag: string | null;
  status_color: string;
  verified: boolean;
  order_count: string;
  total_spent: number | string;
  avg_price: number | string;
  status: string;
  last_visit: string | null;
  account_balance?: number | string | null;
  payment_methods: CustomerPaymentMethod[] | null;
  reviews: CustomerReviewGroup[] | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerInput = {
  name: string;
  email?: string;
  status?: string;
  image?: string;
  phone?: string;
  company?: string;
  timezone?: string;
  billingAddress?: string;
  vatId?: string;
  locationName?: string;
  locationFlag?: string;
  statusColor?: string;
  verified?: boolean;
  paymentMethods?: CustomerPaymentMethod[];
  reviews?: CustomerReviewGroup[];
};

export type InventoryOrder = {
  id: string;
  order_number: string;
  date: string;
  customer_id: string | null;
  customer_name: string;
  total: number | string;
  item_count: number;
  category: string | null;
  delivery_status: string;
  delivery_status_variant: string;
  payment_status: string;
  payment_status_variant: string;
  subtotal?: number | string | null;
  shipping_cost?: number | string | null;
  tax?: number | string | null;
  shipment_number?: string | null;
  tracking_number?: string | null;
  shipping_priority?: string | null;
  delivery_method?: string | null;
  current_step?: number | null;
  origin_address?: string | null;
  destination_address?: string | null;
  shipping_label?: string | null;
  shipping_line1?: string | null;
  shipping_line2?: string | null;
  total_time?: string | null;
  departure_time?: string | null;
  expected_arrival?: string | null;
  inventory_state?: string | null;
  store_id?: string | null;
  canceled_at?: string | null;
  cancel_reason?: string | null;
  customer?: InventoryCustomer | null;
  carrier?: InventoryCarrier | null;
  items?: InventoryOrderItem[];
  tracking_events?: InventoryTrackingEvent[];
};

export type InventoryOrderItem = {
  id: string;
  order_id: string;
  product_id?: string | null;
  warehouse_id?: string | null;
  category: string | null;
  price: number | string;
  quantity?: number | null;
  color?: string | null;
  weight?: string | null;
  trend_label: string | null;
  trend_variant: string | null;
  stock: number;
  reserved: number;
  threshold_level: number;
  product_name?: string | null;
  product_sku?: string | null;
  product_image?: string | null;
  product?: InventoryProduct | null;
};

export type InventoryTrackingEvent = {
  id: string;
  order_id: string;
  title: string;
  date: string;
  description: string;
  location: string | null;
  sort_order: number;
};

export type OrderItemInput = {
  productId: string;
  warehouseId?: string | null;
  category?: string;
  price: number;
  quantity: number;
  color?: string;
  weight?: string;
  productName?: string;
  productSku?: string;
  productImage?: string;
};

export type OrderInput = {
  orderNumber?: string;
  date: string;
  customerId?: string | null;
  customerName: string;
  category?: string;
  paymentStatus?: string;
  deliveryStatus?: string;
  carrierId?: string | null;
  carrierName?: string;
  carrierLogo?: string;
  items?: OrderItemInput[];
  warehouseId?: string | null;
  storeId?: string | null;
  idempotencyKey?: string | null;
  shippingPriority?: string;
  deliveryMethod?: string;
  originAddress?: string;
  destinationAddress?: string;
  shippingLabel?: string;
  shippingLine1?: string;
  shippingLine2?: string;
};

export type InventoryVariant = {
  id: string;
  product_id: string;
  size: string;
  color: string;
  on_hand: number;
  price: number | string;
  available: boolean;
};

export type InventoryOption = {
  id: string;
  product_id: string;
  name: string;
  sort_order: number;
  values?: { id: string; value: string; sort_order: number }[];
};

function requireClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  return supabase;
}

function persistVariantId(id?: string) {
  if (!id || id.startsWith('new-') || id.length < 20) {
    return crypto.randomUUID();
  }
  return id;
}

function displayDate(value?: string | null) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, 'd MMM, yyyy');
}

export function statusVariant(label: string) {
  const normalized = label.toLowerCase();
  if (['live', 'active', 'paid', 'delivered', 'allocated', 'success'].includes(normalized)) {
    return 'success';
  }
  if (['draft', 'pending', 'on hold', 'secondary'].includes(normalized)) {
    return 'secondary';
  }
  if (['must act', 'inactive', 'canceled', 'unpaid', 'archived', 'banned'].includes(normalized)) {
    return 'destructive';
  }
  return 'info';
}

export function mapProductList(product: InventoryProduct): ProductListRow {
  const image = product.image ?? '11.png';
  const qty = product.stock_level?.qty ?? 0;
  const threshold = product.stock_level?.threshold ?? 0;
  const needsAction =
    product.status === 'Live' && !product.deleted_at && threshold > 0 && qty <= threshold;
  return {
    id: product.id,
    productInfo: {
      image,
      title: product.name,
      label: product.sku,
      tooltip: product.full_name ?? product.description ?? product.name,
    },
    category: product.category?.name ?? '',
    price: formatMoney(product.price),
    status: {
      label: needsAction ? 'Must Act' : product.status,
      variant: statusVariant(needsAction ? 'Must Act' : product.status),
    },
    created: displayDate(product.created_at),
    updated: displayDate(product.updated_at),
    barcode: product.barcode ?? '',
    description: product.description ?? '',
    featured: Boolean(product.featured),
    tags: product.tags ?? [],
    categoryId: product.category_id,
    brandId: product.brand_id,
    image,
    deletedAt: product.deleted_at ?? null,
    needsAction,
  };
}

export function mapCategory(category: InventoryCategory): CategoryListRow {
  const qty = Array.isArray(category.products) ? String(category.products[0]?.count ?? 0) : '0';
  return {
    id: category.id,
    productInfo: {
      image: category.icon ?? 'running-shoes.svg',
      title: category.name,
      label: category.code ?? '',
    },
    productsQty: qty,
    // Seeded total_earnings is not maintained by sales — do not present as live earnings.
    totalEarnings: '—',
    status: {
      label: category.status,
      variant: statusVariant(category.status),
    },
    featured: category.featured,
    description: category.description,
    created: displayDate(category.created_at),
    updated: displayDate(category.updated_at),
  };
}

export function mapAllStock(product: InventoryProduct): AllStockRow {
  const stock = product.stock_level;
  return {
    id: product.id,
    productInfo: {
      image: product.image ?? '11.png',
      title: product.name,
      label: product.sku,
      tooltip: product.full_name ?? product.name,
    },
    stockFlow: {
      number1: stock?.qty ?? 0,
      number2: stock?.inbound_qty ?? 0,
      number3: stock?.outbound_qty ?? 0,
    },
    delta: {
      label: stock?.delta_label ?? '0',
      variant: stock?.delta_variant ?? 'secondary',
    },
    price: formatMoney(product.price),
    category: product.category?.name ?? '',
    supplier: {
      name: product.supplier?.name ?? '',
      logo: product.supplier?.logo ?? 'clusterhq.svg',
    },
    updated: displayDate(product.updated_at),
  };
}

export function mapCurrentStock(product: InventoryProduct): CurrentStockRow {
  const stock = product.stock_level;
  return {
    id: product.id,
    productInfo: {
      image: product.image ?? '11.png',
      title: product.name,
      label: product.sku,
      tooltip: product.full_name ?? product.name,
    },
    stock: stock?.qty ?? 0,
    rsvd: stock?.reserved ?? 0,
    tlvl: stock?.threshold ?? 0,
    delta: {
      label: stock?.delta_label ?? '0',
      variant: stock?.delta_variant ?? 'secondary',
    },
    sum: formatMoney(stock?.total_value ?? 0),
    lastMoved: stock?.last_moved ?? displayDate(product.updated_at),
    handler: stock?.handler ?? '',
    trend: {
      label: stock?.trend_label ?? 'Steady',
      variant: stock?.trend_variant ?? 'secondary',
    },
    category: product.category?.name ?? '',
    price: formatMoney(product.price),
    reorderQty: stock?.reorder_qty ?? 0,
    leadTimeDays: stock?.lead_time_days ?? 0,
    autoReorder: Boolean(stock?.auto_reorder),
    created: displayDate(product.created_at),
    updated: displayDate(product.updated_at),
  };
}

export function mapStockPlanner(product: InventoryProduct): StockPlannerRow {
  const stock = product.stock_level;
  const current = mapCurrentStock(product);
  return {
    ...current,
    flow: Number(stock?.flow_rate ?? 0),
    reorderIn: {
      days: stock?.reorder_in_days ?? 0,
      date: stock?.reorder_date ?? '',
    },
    reorder: stock?.reorder_qty ?? 0,
    leadTime: {
      days: stock?.lead_time_days ?? 0,
      date: stock?.lead_time_date ?? '',
    },
    ar: Boolean(stock?.auto_reorder),
  };
}

function displayDateTime(value?: string | null) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, 'd MMM yyyy, HH:mm');
}

function displayProfileName(profile?: InventoryProfileName | null) {
  const full = profile?.full_name?.trim();
  if (full) return full;
  const parts = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
  if (parts) return parts;
  if (profile?.email?.trim()) return profile.email.trim();
  return 'Unknown';
}

export function mapInbound(row: InventoryInboundShipment): InboundStockRow {
  const stockValue = parseMoney(row.stock_value);
  return {
    id: row.id,
    productInfo: {
      title: row.product?.name ?? '',
      label: row.product?.sku ?? '',
      tooltip: row.product?.full_name ?? row.product?.name ?? '',
    },
    dateOrder: row.order_date,
    qty: row.qty,
    stock: formatMoney(stockValue),
    stockValue,
    status: {
      label: row.status,
      variant: row.status_variant,
    },
    arrivalDate: row.arrival_date,
    createdAt: row.created_at,
    receivedAt: displayDateTime(row.created_at) || row.order_date,
    receivedBy: row.received_by_name?.trim() || displayProfileName(row.receiver),
    carrier: row.carrier?.name ?? '',
    warehouse: row.warehouse?.code ?? '',
    warehouseName: row.warehouse?.name ?? row.warehouse?.code ?? '',
    warehouseId: row.warehouse_id ?? row.warehouse?.id ?? null,
    supplier: {
      name: row.supplier?.name ?? '',
      logo: row.supplier?.logo ?? 'clusterhq.svg',
    },
  };
}

export function mapOutbound(row: InventoryOutboundShipment): OutboundStockRow {
  return {
    id: row.id,
    dateOrder: row.order_ref,
    productInfo: {
      title: row.product?.name ?? '',
      label: row.product?.sku ?? '',
      tooltip: row.product?.full_name ?? row.product?.name ?? '',
    },
    qty: String(row.qty),
    status: {
      label: row.status,
      variant: row.status_variant,
    },
    expDelivery: row.expected_delivery,
    warehouse: row.warehouse?.code ?? '',
    warehouseId: row.warehouse_id ?? row.warehouse?.id ?? null,
    carrier: row.carrier?.name ?? '',
    notify: row.notify,
  };
}

export function mapCustomer(row: InventoryCustomer): CustomerListRow {
  return withCustomerProfile({
    id: row.id,
    user: row.code,
    customerInfo: {
      image: row.image ?? '300-13.png',
      title: row.name,
      label: row.email ?? '',
      statusColor: row.status_color,
      verified: row.verified,
    },
    location: {
      name: row.location_name ?? '',
      flag: row.location_flag ?? 'estonia.svg',
    },
    total: formatMoney(row.total_spent),
    price: formatMoney(row.avg_price),
    status: {
      label: row.status,
      variant: statusVariant(row.status),
    },
    created: row.order_count,
    updated: row.last_visit ? displayDate(row.last_visit) : displayDate(row.updated_at),
    phone: row.phone ?? undefined,
    company: row.company ?? undefined,
    timezone: row.timezone ?? undefined,
    billingAddress: row.billing_address ?? undefined,
    vatId: row.vat_id ?? undefined,
    joined: displayDate(row.created_at),
    lastVisit: row.last_visit ? displayDate(row.last_visit) : displayDate(row.updated_at),
    lastVisitAt: row.last_visit ?? row.updated_at,
    accountBalance: parseMoney(row.account_balance),
    paymentMethods: row.payment_methods ?? undefined,
    reviews: row.reviews ?? undefined,
    deletedAt: row.deleted_at ?? null,
  });
}

export function mapOrderToDetails(row: OrderListRow): DetailsOrdersRow {
  return {
    date: row.date,
    order: row.order,
    id: row.id,
    total: row.total,
    paymentStatus: row.paymentStatus,
    items: row.items,
    carrier: row.carrier,
    category: row.category,
  };
}

export function mapOrderToInvoice(row: OrderListRow): DetailsInvoiceRow {
  return {
    invoice: `INV-${row.order}`,
    date: row.date,
    dueDate: row.date,
    id: row.id,
    total: row.total,
    paymentStatus: row.paymentStatus,
  };
}

export function mapOrder(row: InventoryOrder): OrderListRow {
  return {
    id: row.id,
    order: row.order_number,
    date: row.date,
    customer: row.customer_name,
    customerId: row.customer_id,
    total: formatMoney(row.total),
    items: row.item_count,
    category: row.category ?? '',
    deliveryStatus: {
      label: row.delivery_status,
      variant: row.delivery_status_variant,
    },
    paymentStatus: {
      label: row.payment_status,
      variant: row.payment_status_variant,
    },
    carrier: {
      name: row.carrier?.name ?? '',
      logo: row.carrier?.logo ?? 'ups.svg',
    },
    subtotal: formatMoney(row.subtotal ?? 0),
    shippingCost: formatMoney(row.shipping_cost ?? 0),
    tax: formatMoney(row.tax ?? 0),
    shipmentNumber: row.shipment_number ?? undefined,
    trackingNumber: row.tracking_number ?? undefined,
    shippingPriority: row.shipping_priority ?? undefined,
    deliveryMethod: row.delivery_method ?? undefined,
    currentStep: row.current_step ?? undefined,
    originAddress: row.origin_address ?? undefined,
    destinationAddress: row.destination_address ?? undefined,
    shippingLabel: row.shipping_label ?? undefined,
    shippingLine1: row.shipping_line1 ?? undefined,
    shippingLine2: row.shipping_line2 ?? undefined,
    totalTime: row.total_time ?? undefined,
    departureTime: row.departure_time ?? undefined,
    expectedArrival: row.expected_arrival ?? undefined,
  };
}

export function mapOrderItem(row: InventoryOrderItem): OrderItemRow {
  const snapshotTitle = row.product_name?.trim() || '';
  const snapshotSku = row.product_sku?.trim() || '';
  const title = row.product?.name || snapshotTitle || 'Deleted product';
  const sku = row.product?.sku || snapshotSku || '';
  return {
    id: row.id,
    productId: row.product_id ?? row.product?.id ?? undefined,
    warehouseId: row.warehouse_id ?? undefined,
    productInfo: {
      image: row.product?.image || row.product_image || '11.png',
      title,
      label: sku,
      tooltip: row.product?.full_name ?? title,
    },
    category: row.category ?? row.product?.category?.name ?? '',
    price: formatMoney(row.price),
    trends: {
      label: row.trend_label ?? 'Steady',
      variant: row.trend_variant ?? 'secondary',
    },
    stock: row.stock,
    reserved: row.reserved,
    thresholdLevel: row.threshold_level,
    supplier: {
      name: row.product?.supplier?.name ?? '',
      logo: row.product?.supplier?.logo ?? 'clusterhq.svg',
    },
    quantity: row.quantity ?? 1,
    color: row.color ?? undefined,
    weight: row.weight ?? undefined,
  };
}

export function mapTrackingEvent(row: InventoryTrackingEvent): OrderTrackingEventRow {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    description: row.description,
    location: row.location ?? undefined,
    sortOrder: row.sort_order,
  };
}

export function mapOrderDetail(row: InventoryOrder): OrderDetailRow {
  const list = mapOrder(row);
  const items = (row.items ?? []).map(mapOrderItem);
  const detail = buildOrderDetail(list, items);
  return {
    ...detail,
    ...list,
    total: list.total,
    subtotal: row.subtotal != null ? formatMoney(row.subtotal) : detail.subtotal,
    shippingCost: row.shipping_cost != null ? formatMoney(row.shipping_cost) : detail.shippingCost,
    tax: row.tax != null ? formatMoney(row.tax) : detail.tax,
    shipmentNumber: row.shipment_number || detail.shipmentNumber,
    trackingNumber: row.tracking_number || detail.trackingNumber,
    shippingPriority: row.shipping_priority || detail.shippingPriority,
    deliveryMethod: row.delivery_method || detail.deliveryMethod,
    currentStep: row.current_step ?? detail.currentStep,
    originAddress: row.origin_address || detail.originAddress,
    destinationAddress: row.destination_address || detail.destinationAddress,
    shippingLabel: row.shipping_label || detail.shippingLabel,
    shippingLine1: row.shipping_line1 || detail.shippingLine1,
    shippingLine2: row.shipping_line2 || detail.shippingLine2,
    totalTime: row.total_time || detail.totalTime,
    departureTime: row.departure_time || detail.departureTime,
    expectedArrival: row.expected_arrival || detail.expectedArrival,
    detailItems: items.length
      ? items.map((item) => ({
          image: item.productInfo.image,
          title: item.productInfo.tooltip || item.productInfo.title,
          sku: item.productInfo.label,
          color: item.color ?? 'Black',
          weight: item.weight ?? '1.0',
        }))
      : detail.detailItems,
    trackingEvents: (row.tracking_events ?? []).length
      ? [...(row.tracking_events ?? [])].sort((a, b) => a.sort_order - b.sort_order).map(mapTrackingEvent)
      : detail.trackingEvents,
  };
}

export function mapVariant(row: InventoryVariant): ProductVariantRow {
  return {
    id: row.id,
    size: row.size,
    color: row.color,
    onHand: String(row.on_hand),
    price: Number(row.price).toFixed(2),
    available: row.available ? 'Yes' : 'No',
  };
}

export function mapOptions(rows: InventoryOption[]): ProductOptionCard[] {
  return rows.map((option, index) => ({
    id: option.id,
    name: option.name,
    isOpen: index === 0,
    values: (option.values ?? []).map((value) => ({
      id: value.id,
      value: value.value,
    })),
  }));
}

const productSelect = `
  *,
  category:inventory_categories(*),
  brand:inventory_brands(*),
  supplier:inventory_suppliers(*),
  stock_level:inventory_stock_levels(*)
`;

export async function fetchProducts() {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_products')
    .select(productSelect)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as InventoryProduct[]).map(mapProductList);
}

export async function fetchDeletedProducts() {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_products')
    .select(productSelect)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as InventoryProduct[]).map(mapProductList);
}

export async function fetchProductById(id: string) {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_products')
    .select(productSelect)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapProductList(data as InventoryProduct);
}

export async function fetchCategories() {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_categories')
    .select('*, products:inventory_products(count)')
    .order('name');
  if (error) throw error;
  return ((data ?? []) as InventoryCategory[]).map(mapCategory);
}

export async function fetchProductsByCategory(categoryId: string) {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_products')
    .select(productSelect)
    .eq('category_id', categoryId)
    .is('deleted_at', null)
    .order('name');
  if (error) throw error;
  return (data ?? []) as InventoryProduct[];
}

export async function fetchStockProducts() {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_products')
    .select(productSelect)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as InventoryProduct[];
}

export type InventoryStockMovement = {
  product_id: string;
  warehouse_id: string | null;
  delta: number;
  reason: string;
  created_at: string;
};

export async function fetchStockMovements(input: {
  from: Date;
  warehouseId?: string | null;
}): Promise<InventoryStockMovement[]> {
  const client = requireClient();
  const pageSize = 1000;
  const rows: InventoryStockMovement[] = [];
  let fromIdx = 0;

  while (true) {
    let query = client
      .from('inventory_stock_movements')
      .select('product_id, warehouse_id, delta, reason, created_at')
      .gte('created_at', input.from.toISOString())
      .order('created_at', { ascending: true })
      .range(fromIdx, fromIdx + pageSize - 1);
    if (input.warehouseId) {
      query = query.eq('warehouse_id', input.warehouseId);
    }
    const { data, error } = await query;
    if (error) throw error;
    const page = (data ?? []) as InventoryStockMovement[];
    rows.push(...page);
    if (page.length < pageSize) break;
    fromIdx += pageSize;
  }

  return rows;
}

export async function fetchInboundShipments() {
  const client = requireClient();
  const baseSelect = `*, product:inventory_products(*, supplier:inventory_suppliers(*)), supplier:inventory_suppliers(*), carrier:inventory_carriers(*), warehouse:inventory_warehouses(*)`;
  const withActorSelect = `${baseSelect}, receiver:inventory_profiles!created_by(id, full_name, first_name, last_name, email)`;
  const withActor = await client
    .from('inventory_inbound_shipments')
    .select(withActorSelect)
    .order('created_at', { ascending: false });
  if (!withActor.error) {
    return ((withActor.data ?? []) as InventoryInboundShipment[]).map(mapInbound);
  }
  const fallback = await client
    .from('inventory_inbound_shipments')
    .select(baseSelect)
    .order('created_at', { ascending: false });
  if (fallback.error) throw withActor.error;
  return ((fallback.data ?? []) as InventoryInboundShipment[]).map(mapInbound);
}

export async function fetchOutboundShipments() {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_outbound_shipments')
    .select(`*, product:inventory_products(*), warehouse:inventory_warehouses(*), carrier:inventory_carriers(*)`)
    .order('expected_delivery', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as InventoryOutboundShipment[]).map(mapOutbound);
}

export async function fetchCustomers() {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_customers')
    .select('*')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as InventoryCustomer[]).map(mapCustomer);
}

export async function fetchDeletedCustomers() {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_customers')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as InventoryCustomer[]).map(mapCustomer);
}

export async function fetchCustomerById(id: string) {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_customers')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapCustomer(data as InventoryCustomer);
}

export async function fetchOrdersByCustomer(customerId: string) {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_orders')
    .select(`*, customer:inventory_customers(*), carrier:inventory_carriers(*)`)
    .eq('customer_id', customerId)
    .order('date', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as InventoryOrder[]).map(mapOrder);
}

const orderSelect = `
  *,
  customer:inventory_customers(*),
  carrier:inventory_carriers(*),
  items:inventory_order_items(*, product:inventory_products(*, category:inventory_categories(*), supplier:inventory_suppliers(*))),
  tracking_events:inventory_order_tracking_events(*)
`;

export async function fetchOrders(storeId?: string | null) {
  const client = requireClient();
  let query = client
    .from('inventory_orders')
    .select(`*, customer:inventory_customers(*), carrier:inventory_carriers(*)`)
    .order('date', { ascending: false });
  const scopedStoreId = storeId ?? import.meta.env.VITE_STORE_ID ?? null;
  if (scopedStoreId) {
    query = query.eq('store_id', scopedStoreId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as InventoryOrder[]).map(mapOrder);
}

export async function fetchOrderById(id: string) {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_orders')
    .select(orderSelect)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapOrderDetail(data as InventoryOrder);
}

export async function fetchOrderTracking(orderId: string) {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_order_tracking_events')
    .select('*')
    .eq('order_id', orderId)
    .order('sort_order');
  if (error) throw error;
  return ((data ?? []) as InventoryTrackingEvent[]).map(mapTrackingEvent);
}

export async function fetchOrderItems(orderId?: string) {
  const client = requireClient();
  let query = client
    .from('inventory_order_items')
    .select(`*, product:inventory_products(*, category:inventory_categories(*), supplier:inventory_suppliers(*))`);
  if (orderId) query = query.eq('order_id', orderId);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as InventoryOrderItem[]).map(mapOrderItem);
}

export async function fetchCarriers() {
  const client = requireClient();
  const { data, error } = await client.from('inventory_carriers').select('*').order('name');
  if (error) throw error;
  return (data ?? []) as InventoryCarrier[];
}

export async function fetchVariants(productId: string) {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_product_variants')
    .select('*')
    .eq('product_id', productId);
  if (error) throw error;
  return ((data ?? []) as InventoryVariant[]).map(mapVariant);
}

export async function fetchOptions(productId: string) {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_product_options')
    .select('*, values:inventory_product_option_values(*)')
    .eq('product_id', productId)
    .order('sort_order');
  if (error) throw error;
  return mapOptions((data ?? []) as InventoryOption[]);
}

function validateProductVariants(variants?: ProductVariantRow[]) {
  if (!variants?.length) return;
  const seen = new Set<string>();
  for (const variant of variants) {
    const key = `${variant.size}::${variant.color}`.toLowerCase();
    if (seen.has(key)) {
      throw new Error(`Duplicate variant size/color: ${variant.size} / ${variant.color}`);
    }
    seen.add(key);
    assertNonNegativeMoney(parseMoney(variant.price), 'Variant price');
    assertNonNegativeQty(parseQty(variant.onHand), 'Variant on hand');
  }
}

export async function createProduct(input: {
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  categoryId?: string | null;
  brandId?: string | null;
  price?: number;
  status?: string;
  featured?: boolean;
  tags?: string[];
  image?: string;
  warehouseId?: string;
  variants?: ProductVariantRow[];
}) {
  const client = requireClient();
  const name = input.name.trim();
  const sku = input.sku.trim();
  if (!name || !sku) {
    throw new Error('Product name and SKU are required');
  }
  const price = assertNonNegativeMoney(input.price ?? 0);
  validateProductVariants(input.variants);

  const productId = crypto.randomUUID();
  const { data, error } = await client.rpc('inventory_create_product', {
    payload: {
      id: productId,
      name,
      sku,
      barcode: input.barcode?.trim() || null,
      description: input.description ?? null,
      category_id: input.categoryId ?? null,
      brand_id: input.brandId ?? null,
      price,
      status: input.status ?? 'Live',
      featured: Boolean(input.featured),
      tags: input.tags ?? [],
      image: input.image ?? '11.png',
      full_name: name,
      warehouse_id: input.warehouseId ?? null,
      variants: (input.variants ?? []).map((variant) => ({
        id: persistVariantId(variant.id),
        size: variant.size,
        color: variant.color,
        // Variant on_hand is display metadata only; warehouse stock is source of truth.
        on_hand: 0,
        price: parseMoney(variant.price),
        available: variant.available === 'Yes',
      })),
    },
  });
  if (error) throw error;
  return (data as string) || productId;
}

export async function updateProduct(
  id: string,
  input: Partial<{
    name: string;
    sku: string;
    barcode: string;
    description: string;
    categoryId: string | null;
    brandId: string | null;
    price: number;
    status: string;
    featured: boolean;
    tags: string[];
    image: string;
  }>,
) {
  const client = requireClient();
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) {
    payload.name = input.name;
    payload.full_name = input.name;
  }
  if (input.sku !== undefined) payload.sku = input.sku;
  if (input.barcode !== undefined) payload.barcode = input.barcode || null;
  if (input.description !== undefined) payload.description = input.description || null;
  if (input.categoryId !== undefined) payload.category_id = input.categoryId;
  if (input.brandId !== undefined) payload.brand_id = input.brandId;
  if (input.price !== undefined) payload.price = assertNonNegativeMoney(input.price);
  if (input.status !== undefined) payload.status = input.status;
  if (input.featured !== undefined) payload.featured = input.featured;
  if (input.tags !== undefined) payload.tags = input.tags;
  if (input.image !== undefined) payload.image = input.image;

  if (Object.keys(payload).length === 0) return;

  const { error } = await client
    .from('inventory_products')
    .update(payload)
    .eq('id', id)
    .is('deleted_at', null);
  if (error) throw error;
}

export async function softDeleteProduct(id: string) {
  const client = requireClient();
  const { error } = await client.rpc('inventory_soft_delete_product', {
    p_product_id: id,
  });
  if (error) throw error;
}

/** Soft-deletes a product. Prefer this over hard delete. */
export async function deleteProduct(id: string) {
  return softDeleteProduct(id);
}

export async function restoreProduct(id: string) {
  const client = requireClient();
  const { error } = await client.rpc('inventory_restore_product', {
    p_product_id: id,
  });
  if (error) throw error;
}

export async function fetchProductDeleteImpact(id: string): Promise<ProductDeleteImpact> {
  const client = requireClient();
  const { data, error } = await client.rpc('inventory_product_delete_impact', {
    p_product_id: id,
  });
  if (error) throw error;
  return data as ProductDeleteImpact;
}

export async function hardDeleteProduct(id: string) {
  const client = requireClient();
  const { error } = await client.rpc('inventory_hard_delete_product', {
    p_product_id: id,
  });
  if (error) throw error;
}

export async function uploadProductImage(file: File, productId?: string) {
  const client = requireClient();
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
  const path = `${productId || 'draft'}/${crypto.randomUUID()}.${safeExt}`;
  const { error } = await client.storage.from('product-images').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || `image/${safeExt}`,
  });
  if (error) throw error;
  const { data } = client.storage.from('product-images').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadCategoryIcon(file: File, categoryId?: string) {
  const client = requireClient();
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext) ? ext : 'png';
  const path = `categories/${categoryId || 'draft'}/${crypto.randomUUID()}.${safeExt}`;
  const { error } = await client.storage.from('product-images').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || `image/${safeExt === 'svg' ? 'svg+xml' : safeExt}`,
  });
  if (error) throw mapCategoryError(error, 'Unable to upload category icon');
  const { data } = client.storage.from('product-images').getPublicUrl(path);
  return data.publicUrl;
}

export async function createCategory(input: {
  name: string;
  status?: string;
  featured?: boolean;
  description?: string;
  icon?: string;
}) {
  const client = requireClient();
  let parsed;
  try {
    parsed = parseCategoryInput(input);
  } catch (error) {
    throw formatCategoryValidationError(error);
  }

  await assertCategoryNameAvailable(parsed.name);

  const id = crypto.randomUUID();
  const code = generateCategoryCode(parsed.name, id);
  const { error } = await client.from('inventory_categories').insert({
    id,
    name: parsed.name,
    status: parsed.status ?? 'Active',
    featured: Boolean(parsed.featured),
    description: parsed.description ?? null,
    icon: parsed.icon ?? 'running-shoes.svg',
    code,
  });
  if (error) throw mapCategoryError(error, 'Unable to create category');
  return { id, code };
}

export async function updateCategory(
  id: string,
  input: Partial<{ name: string; status: string; featured: boolean; description: string; icon: string }>,
) {
  const client = requireClient();
  // Intentionally never patch `code` — category codes are immutable after create.
  const payload: Record<string, unknown> = {};

  if (input.name !== undefined) {
    let parsedName: string;
    try {
      parsedName = parseCategoryInput({ name: input.name }).name;
    } catch (error) {
      throw formatCategoryValidationError(error);
    }
    await assertCategoryNameAvailable(parsedName, id);
    payload.name = parsedName;
  }
  if (input.status !== undefined) {
    payload.status = normalizeCategoryStatus(input.status);
  }
  if (input.featured !== undefined) {
    payload.featured = Boolean(input.featured);
  }
  if (input.description !== undefined) {
    const description = input.description ?? '';
    if (description.length > 500) {
      throw new Error('Description must be 500 characters or fewer');
    }
    payload.description = description;
  }
  if (input.icon !== undefined) {
    payload.icon = input.icon;
  }

  if (!Object.keys(payload).length) return;

  const { error } = await client.from('inventory_categories').update(payload).eq('id', id);
  if (error) throw mapCategoryError(error, 'Unable to update category');
}

export type CategoryDeleteInfo = {
  productCount: number;
  messages: string[];
};

export async function getCategoryDeleteInfo(id: string): Promise<CategoryDeleteInfo> {
  const client = requireClient();
  const { count, error } = await client
    .from('inventory_products')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id);
  if (error) throw mapCategoryError(error, 'Unable to check category products');

  const productCount = count ?? 0;
  const messages: string[] = [];
  if (productCount > 0) {
    messages.push(
      `${productCount} ${productCount === 1 ? 'product is' : 'products are'} linked to this category.`,
    );
    messages.push(
      'Reassign them to another category, or continue to leave them Uncategorized.',
    );
  } else {
    messages.push('Delete this category? This cannot be undone.');
  }

  return { productCount, messages };
}

export async function deleteCategory(
  id: string,
  options?: { reassignToCategoryId?: string | null },
) {
  const client = requireClient();
  const info = await getCategoryDeleteInfo(id);

  if (options?.reassignToCategoryId) {
    if (options.reassignToCategoryId === id) {
      throw new Error('Choose a different category to reassign products');
    }
    const { error: reassignError } = await client
      .from('inventory_products')
      .update({ category_id: options.reassignToCategoryId })
      .eq('category_id', id);
    if (reassignError) throw mapCategoryError(reassignError, 'Unable to reassign products');
  }

  const { error } = await client.from('inventory_categories').delete().eq('id', id);
  if (error) throw mapCategoryError(error, 'Unable to delete category');

  return { productCount: info.productCount, reassigned: Boolean(options?.reassignToCategoryId) };
}

export async function archiveCategories(ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) return { count: 0 };
  const client = requireClient();
  const { error } = await client
    .from('inventory_categories')
    .update({ status: 'Archived' })
    .in('id', uniqueIds);
  if (error) throw mapCategoryError(error, 'Unable to archive categories');
  return { count: uniqueIds.length };
}

export async function deleteCategories(
  ids: string[],
  options?: { reassignToCategoryId?: string | null },
) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  let productCount = 0;
  for (const id of uniqueIds) {
    if (options?.reassignToCategoryId === id) {
      throw new Error('Choose a different category to reassign products');
    }
    const result = await deleteCategory(id, {
      reassignToCategoryId:
        options?.reassignToCategoryId && options.reassignToCategoryId !== id
          ? options.reassignToCategoryId
          : null,
    });
    productCount += result.productCount;
  }
  return {
    count: uniqueIds.length,
    productCount,
    reassigned: Boolean(options?.reassignToCategoryId),
  };
}

export async function getCategoriesDeleteInfo(ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  let productCount = 0;
  for (const id of uniqueIds) {
    const info = await getCategoryDeleteInfo(id);
    productCount += info.productCount;
  }
  const messages: string[] = [];
  if (productCount > 0) {
    messages.push(
      `${productCount} ${productCount === 1 ? 'product is' : 'products are'} linked across the selected categories.`,
    );
    messages.push(
      'Reassign them to another category, or continue to leave them Uncategorized.',
    );
  } else {
    messages.push(`Delete ${uniqueIds.length} ${uniqueIds.length === 1 ? 'category' : 'categories'}? This cannot be undone.`);
  }
  return { productCount, messages, count: uniqueIds.length };
}

async function assertCategoryNameAvailable(name: string, excludeId?: string) {
  const client = requireClient();
  const normalized = normalizeCategoryName(name);
  const { data, error } = await client.from('inventory_categories').select('id, name');
  if (error) throw mapCategoryError(error, 'Unable to validate category name');

  const conflict = (data ?? []).find(
    (row) => row.id !== excludeId && normalizeCategoryName(row.name ?? '') === normalized,
  );
  if (conflict) {
    throw new Error('A category with this name already exists');
  }
}

function formatCategoryValidationError(error: unknown): Error {
  if (error instanceof ZodError) {
    return new Error(error.issues[0]?.message ?? 'Invalid category input');
  }
  return mapCategoryError(error, 'Invalid category input');
}

export async function updateStockLevel(
  productId: string,
  input: Partial<InventoryStockLevel> & { warehouseId?: string; expectedQty?: number },
) {
  const client = requireClient();
  const warehouseId = input.warehouseId;
  const expectedQty = input.expectedQty;
  const { warehouseId: _warehouseId, expectedQty: _expectedQty, ...stockPayload } = input;
  if (stockPayload.qty !== undefined && !warehouseId) {
    throw new Error('Select a warehouse before editing quantity');
  }
  if (warehouseId && stockPayload.qty !== undefined) {
    const { data: warehouse, error: warehouseError } = await client
      .from('inventory_warehouses')
      .select('id, status')
      .eq('id', warehouseId)
      .maybeSingle();
    if (warehouseError) throw warehouseError;
    if (!warehouse?.id || String(warehouse.status).toLowerCase() !== 'active') {
      throw new Error('Select an Active warehouse');
    }
    const { data: currentStock, error: currentError } = await client
      .from('inventory_warehouse_stock')
      .select('qty')
      .eq('warehouse_id', warehouseId)
      .eq('product_id', productId)
      .maybeSingle();
    if (currentError) throw currentError;
    const currentQty = Number(currentStock?.qty ?? 0);
    if (stockPayload.qty > currentQty) {
      throw new Error('Stock can only be added with Stock Entry');
    }
    const { error: qtyError } = await client.rpc('inventory_set_warehouse_qty', {
      p_warehouse_id: warehouseId,
      p_product_id: productId,
      p_qty: stockPayload.qty,
      p_expected_qty: expectedQty ?? null,
      p_reason: 'stock_level_edit',
    });
    if (qtyError) throw qtyError;
  }
  const payload: Record<string, unknown> = { ...stockPayload };
  delete payload.warehouseId;
  delete payload.expectedQty;
  // Never write aggregate qty/reserved directly — warehouse sync owns those fields.
  delete payload.qty;
  delete payload.reserved;
  if (!Object.keys(payload).length) return;
  const { error } = await client
    .from('inventory_stock_levels')
    .update(payload)
    .eq('product_id', productId);
  if (error) throw error;
}

export async function deleteStockProduct(productId: string) {
  return deleteProduct(productId);
}

export type InboundShipmentLineInput = {
  productId: string;
  warehouseId: string;
  qty: number;
  unitValue: number;
  productName: string;
  productSku: string;
  warehouseName: string;
  supplierId?: string | null;
  carrierId?: string | null;
  orderDate?: string;
  arrivalDate?: string;
  status?: string;
};

export type InboundShipmentBatchLineResult = {
  shipmentId: string;
  productId: string;
  productName: string;
  productSku: string;
  warehouseId: string;
  warehouseName: string;
  qty: number;
  unitValue: number;
  lineTotal: number;
  orderDate: string;
};

export type InboundShipmentBatchResult = {
  lines: InboundShipmentBatchLineResult[];
  totalQty: number;
  totalValue: number;
  orderDate: string;
};

export class InboundShipmentBatchError extends Error {
  readonly succeeded: number;
  readonly total: number;
  readonly results: InboundShipmentBatchLineResult[];

  constructor(message: string, succeeded: number, total: number, results: InboundShipmentBatchLineResult[]) {
    super(message);
    this.name = 'InboundShipmentBatchError';
    this.succeeded = succeeded;
    this.total = total;
    this.results = results;
  }
}

export async function createInboundShipment(input: {
  productId: string;
  warehouseId: string;
  qty: number;
  supplierId?: string | null;
  carrierId?: string | null;
  orderDate?: string;
  arrivalDate?: string;
  stockValue?: number;
  status?: string;
}) {
  const client = requireClient();
  const { data: warehouse, error: warehouseError } = await client
    .from('inventory_warehouses')
    .select('id, status')
    .eq('id', input.warehouseId)
    .maybeSingle();
  if (warehouseError) throw warehouseError;
  if (!warehouse?.id || String(warehouse.status).toLowerCase() !== 'active') {
    throw new Error('Select an Active warehouse');
  }

  const id = crypto.randomUUID();
  const orderDate = input.orderDate ?? format(new Date(), 'd MMM, yyyy');
  const arrivalDate = input.arrivalDate ?? orderDate;
  const status = input.status ?? 'Received';
  const { data, error } = await client.rpc('inventory_receive_inbound_shipment', {
    payload: {
      id,
      product_id: input.productId,
      warehouse_id: input.warehouseId,
      supplier_id: input.supplierId ?? '',
      carrier_id: input.carrierId ?? '',
      order_date: orderDate,
      qty: input.qty,
      stock_value: input.stockValue ?? 0,
      status,
      status_variant: statusVariant(status),
      arrival_date: arrivalDate,
    },
  });
  if (error) throw error;
  return (typeof data === 'string' && data) || id;
}

/** Receive multiple add-only inbound lines sequentially. Stops on first failure. */
export async function createInboundShipmentsBatch(
  lines: InboundShipmentLineInput[],
): Promise<InboundShipmentBatchResult> {
  if (!lines.length) {
    throw new Error('Add at least one stock line');
  }

  const orderDate = lines[0]?.orderDate ?? format(new Date(), 'd MMM, yyyy');
  const results: InboundShipmentBatchLineResult[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const qty = Math.trunc(line.qty);
    const unitValue = Number(line.unitValue);
    if (!line.productId || !line.warehouseId || qty < 1 || !Number.isFinite(unitValue) || unitValue < 0) {
      throw new InboundShipmentBatchError(
        `Invalid stock line at row ${index + 1}`,
        results.length,
        lines.length,
        results,
      );
    }

    const lineTotal = unitValue * qty;
    try {
      const shipmentId = await createInboundShipment({
        productId: line.productId,
        warehouseId: line.warehouseId,
        qty,
        supplierId: line.supplierId,
        carrierId: line.carrierId,
        orderDate: line.orderDate ?? orderDate,
        arrivalDate: line.arrivalDate,
        stockValue: lineTotal,
        status: line.status,
      });
      results.push({
        shipmentId,
        productId: line.productId,
        productName: line.productName,
        productSku: line.productSku,
        warehouseId: line.warehouseId,
        warehouseName: line.warehouseName,
        qty,
        unitValue,
        lineTotal,
        orderDate: line.orderDate ?? orderDate,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unable to receive stock';
      throw new InboundShipmentBatchError(
        results.length > 0
          ? `${reason}. ${results.length} of ${lines.length} lines were received before the failure.`
          : reason,
        results.length,
        lines.length,
        results,
      );
    }
  }

  return {
    lines: results,
    totalQty: results.reduce((sum, row) => sum + row.qty, 0),
    totalValue: results.reduce((sum, row) => sum + row.lineTotal, 0),
    orderDate,
  };
}

export type StockEntryLineInput = {
  productId: string;
  warehouseId: string;
  qty: number;
  unitValue: number;
  productName: string;
  productSku: string;
  warehouseName: string;
  orderDate?: string;
};

export type StockEntryBatchLineResult = {
  productId: string;
  productName: string;
  productSku: string;
  warehouseId: string;
  warehouseName: string;
  qty: number;
  unitValue: number;
  lineTotal: number;
  orderDate: string;
  shipmentId?: string;
};

export type StockEntryBatchResult = {
  type: StockEntryType;
  lines: StockEntryBatchLineResult[];
  totalQty: number;
  totalValue: number;
  orderDate: string;
};

export class StockEntryBatchError extends Error {
  readonly type: StockEntryType;
  readonly succeeded: number;
  readonly total: number;
  readonly results: StockEntryBatchLineResult[];

  constructor(
    message: string,
    type: StockEntryType,
    succeeded: number,
    total: number,
    results: StockEntryBatchLineResult[],
  ) {
    super(message);
    this.name = 'StockEntryBatchError';
    this.type = type;
    this.succeeded = succeeded;
    this.total = total;
    this.results = results;
  }
}

function rpcErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

async function applyManualStockEntryLine(line: StockEntryLineInput, entryType: 'initial' | 'adjustment') {
  const client = requireClient();
  const { data: warehouse, error: warehouseError } = await client
    .from('inventory_warehouses')
    .select('id, status')
    .eq('id', line.warehouseId)
    .maybeSingle();
  if (warehouseError) throw warehouseError;
  if (!warehouse?.id || String(warehouse.status).toLowerCase() !== 'active') {
    throw new Error('Select an Active warehouse');
  }

  const { data, error } = await client.rpc('inventory_apply_stock_entry', {
    payload: {
      id: crypto.randomUUID(),
      product_id: line.productId,
      warehouse_id: line.warehouseId,
      qty: line.qty,
      entry_type: entryType,
    },
  });
  if (error) throw new Error(rpcErrorMessage(error, 'Unable to apply stock entry'));
  return parseStockEntryRpcQty(data);
}

function toStockEntryLineResult(line: StockEntryLineInput, orderDate: string): StockEntryBatchLineResult {
  const qty = Math.trunc(line.qty);
  const unitValue = Number(line.unitValue) || 0;
  return {
    productId: line.productId,
    productName: line.productName,
    productSku: line.productSku,
    warehouseId: line.warehouseId,
    warehouseName: line.warehouseName,
    qty,
    unitValue,
    lineTotal: stockEntryLineTotal(qty, unitValue),
    orderDate: line.orderDate ?? orderDate,
  };
}

/** Apply Initial, Purchased, or Adjustment lines. Purchased writes inbound receipts. */
export async function applyStockEntries(
  type: StockEntryType,
  lines: StockEntryLineInput[],
): Promise<StockEntryBatchResult> {
  if (!lines.length) {
    throw new Error('Add at least one stock line');
  }

  if (type === 'purchased') {
    try {
      const batch = await createInboundShipmentsBatch(
        lines.map((line) => ({
          productId: line.productId,
          warehouseId: line.warehouseId,
          qty: line.qty,
          unitValue: line.unitValue,
          productName: line.productName,
          productSku: line.productSku,
          warehouseName: line.warehouseName,
          orderDate: line.orderDate,
        })),
      );
      return {
        type,
        lines: batch.lines.map((line) => ({
          productId: line.productId,
          productName: line.productName,
          productSku: line.productSku,
          warehouseId: line.warehouseId,
          warehouseName: line.warehouseName,
          qty: line.qty,
          unitValue: line.unitValue,
          lineTotal: line.lineTotal,
          orderDate: line.orderDate,
          shipmentId: line.shipmentId,
        })),
        totalQty: batch.totalQty,
        totalValue: batch.totalValue,
        orderDate: batch.orderDate,
      };
    } catch (error) {
      if (error instanceof InboundShipmentBatchError) {
        throw new StockEntryBatchError(
          error.message,
          type,
          error.succeeded,
          error.total,
          error.results.map((line) => ({
            productId: line.productId,
            productName: line.productName,
            productSku: line.productSku,
            warehouseId: line.warehouseId,
            warehouseName: line.warehouseName,
            qty: line.qty,
            unitValue: line.unitValue,
            lineTotal: line.lineTotal,
            orderDate: line.orderDate,
            shipmentId: line.shipmentId,
          })),
        );
      }
      throw error;
    }
  }

  const orderDate = lines[0]?.orderDate ?? format(new Date(), 'd MMM, yyyy');
  const results: StockEntryBatchLineResult[] = [];
  const fallback = type === 'initial' ? 'Unable to apply initial stock' : 'Unable to apply adjustment';

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const qty = parseStockEntryQty(type, String(line.qty));
    if (!line.productId || !line.warehouseId || qty === null) {
      throw new StockEntryBatchError(
        `Invalid stock line at row ${index + 1}`,
        type,
        results.length,
        lines.length,
        results,
      );
    }

    try {
      const appliedQty = await applyManualStockEntryLine({ ...line, qty }, type);
      results.push(toStockEntryLineResult({ ...line, qty: appliedQty }, orderDate));
    } catch (error) {
      const reason = rpcErrorMessage(error, fallback);
      throw new StockEntryBatchError(
        results.length > 0
          ? `${reason}. ${results.length} of ${lines.length} lines were applied before the failure.`
          : reason,
        type,
        results.length,
        lines.length,
        results,
      );
    }
  }

  return {
    type,
    lines: results,
    totalQty: results.reduce((sum, row) => sum + row.qty, 0),
    totalValue: results.reduce((sum, row) => sum + row.lineTotal, 0),
    orderDate,
  };
}

export async function deleteInboundShipment(id: string) {
  const client = requireClient();
  const { error } = await client.rpc('inventory_delete_inbound_shipment', {
    p_id: id,
  });
  if (error) throw error;
}

export async function deleteOutboundShipment(id: string) {
  const client = requireClient();
  const { error } = await client.rpc('inventory_delete_outbound_shipment', {
    p_id: id,
  });
  if (error) throw error;
}

export async function createOutboundShipment(input: {
  productId: string;
  warehouseId: string;
  qty: number;
  orderRef?: string;
  carrierId?: string | null;
  expectedDelivery?: string;
  status?: string;
  notify?: boolean;
}) {
  const client = requireClient();
  const { data: warehouse, error: warehouseError } = await client
    .from('inventory_warehouses')
    .select('id, status')
    .eq('id', input.warehouseId)
    .maybeSingle();
  if (warehouseError) throw warehouseError;
  if (!warehouse?.id || String(warehouse.status).toLowerCase() !== 'active') {
    throw new Error('Select an Active warehouse');
  }

  const id = crypto.randomUUID();
  const status = input.status ?? 'Allocated';
  const { data, error } = await client.rpc('inventory_create_outbound_shipment', {
    payload: {
      id,
      product_id: input.productId,
      warehouse_id: input.warehouseId,
      carrier_id: input.carrierId ?? '',
      order_ref: input.orderRef ?? '',
      qty: input.qty,
      status,
      status_variant: statusVariant(status),
      expected_delivery: input.expectedDelivery ?? format(new Date(), 'd MMM, yyyy'),
      notify: Boolean(input.notify),
    },
  });
  if (error) throw error;
  return (typeof data === 'string' && data) || id;
}

export async function transferWarehouseQty(input: {
  fromWarehouseId: string;
  toWarehouseId: string;
  productId: string;
  qty: number;
}) {
  const client = requireClient();
  const { data, error } = await client.rpc('inventory_transfer_warehouse_qty', {
    p_from_warehouse_id: input.fromWarehouseId,
    p_to_warehouse_id: input.toWarehouseId,
    p_product_id: input.productId,
    p_qty: input.qty,
  });
  if (error) throw error;
  return data;
}

export async function fetchStockSummary() {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_products')
    .select('id, name, price, stock_level:inventory_stock_levels(qty, reserved, threshold, total_value)');
  if (error) throw error;

  type Row = {
    id: string;
    name: string;
    price: number | string;
    stock_level:
      | { qty: number; reserved: number; threshold: number; total_value: number | string }
      | { qty: number; reserved: number; threshold: number; total_value: number | string }[]
      | null;
  };

  let inStock = 0;
  let lowStock = 0;
  let outOfStock = 0;
  let totalValue = 0;
  const lowStockProducts: Array<{ id: string; name: string; qty: number }> = [];

  for (const row of (data ?? []) as Row[]) {
    const stock = Array.isArray(row.stock_level) ? row.stock_level[0] : row.stock_level;
    const qty = Number(stock?.qty ?? 0);
    const reserved = Number(stock?.reserved ?? 0);
    const available = Math.max(qty - reserved, 0);
    const threshold = Number(stock?.threshold ?? 0);
    const value = Number(stock?.total_value ?? 0) || parseMoney(row.price) * qty;
    totalValue += value;

    if (available <= 0) {
      outOfStock += 1;
    } else if (threshold > 0 && available <= threshold) {
      lowStock += 1;
      lowStockProducts.push({ id: row.id, name: row.name, qty: available });
    } else {
      inStock += 1;
    }
  }

  lowStockProducts.sort((a, b) => a.qty - b.qty);

  return {
    productCount: (data ?? []).length,
    inStock,
    lowStock,
    outOfStock,
    totalValue: Math.round(totalValue * 100) / 100,
    lowStockProducts: lowStockProducts.slice(0, 8),
  };
}

export async function createCustomer(input: CustomerInput) {
  const client = requireClient();
  const location = locationProfile(input.locationName);
  const name = input.name.trim();
  if (!name) throw new Error('Customer name is required');
  const emailRaw = input.email?.trim() || null;
  const email = emailRaw ? emailRaw.toLowerCase() : null;
  const id = crypto.randomUUID();
  const row = {
    id,
    name,
    email,
    status: input.status ?? 'Active',
    image: input.image ?? '300-13.png',
    phone: input.phone ?? null,
    company: input.company ?? null,
    timezone: input.timezone ?? location.timezone,
    billing_address: input.billingAddress ?? (input.locationName ? `${location.city}, ${input.locationName}` : null),
    vat_id: input.vatId ?? null,
    location_name: input.locationName ?? null,
    location_flag: input.locationFlag ?? null,
    status_color: input.statusColor ?? 'offline',
    verified: Boolean(input.verified),
    payment_methods: input.paymentMethods ?? defaultPaymentMethods(name, email ?? undefined),
    reviews: input.reviews ?? defaultCustomerReviews,
  };

  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { error } = await client.from('inventory_customers').insert({
      ...row,
      code: generateCustomerCode(),
    });
    if (!error) return id;
    lastError = error;
    const message = String((error as { message?: string })?.message ?? '').toLowerCase();
    const code = String((error as { code?: string })?.code ?? '');
    const isCodeCollision =
      code === '23505' && (message.includes('code') || message.includes('inventory_customers_code'));
    if (!isCodeCollision) throw error;
  }
  throw lastError instanceof Error ? lastError : new Error('Unable to create customer');
}

export async function updateCustomer(id: string, input: Partial<CustomerInput>) {
  const client = requireClient();
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error('Customer name is required');
    payload.name = name;
  }
  if (input.email !== undefined) {
    const email = input.email?.trim() || null;
    payload.email = email ? email.toLowerCase() : null;
  }
  if (input.status !== undefined) payload.status = input.status;
  if (input.image !== undefined) payload.image = input.image;
  if (input.phone !== undefined) payload.phone = input.phone || null;
  if (input.company !== undefined) payload.company = input.company || null;
  if (input.timezone !== undefined) payload.timezone = input.timezone || null;
  if (input.billingAddress !== undefined) payload.billing_address = input.billingAddress || null;
  if (input.vatId !== undefined) payload.vat_id = input.vatId || null;
  if (input.locationName !== undefined) payload.location_name = input.locationName || null;
  if (input.locationFlag !== undefined) payload.location_flag = input.locationFlag || null;
  if (input.statusColor !== undefined) payload.status_color = input.statusColor;
  if (input.verified !== undefined) payload.verified = input.verified;
  if (input.paymentMethods !== undefined) payload.payment_methods = input.paymentMethods;
  if (input.reviews !== undefined) payload.reviews = input.reviews;
  if (Object.keys(payload).length === 0) return;
  const { error } = await client
    .from('inventory_customers')
    .update(payload)
    .eq('id', id)
    .is('deleted_at', null);
  if (error) throw error;
}

export async function softDeleteCustomer(id: string) {
  const client = requireClient();
  const { error } = await client.rpc('inventory_soft_delete_customer', {
    p_customer_id: id,
  });
  if (error) throw error;
}

/** Soft-deletes a customer. Prefer this over hard delete. */
export async function deleteCustomer(id: string) {
  return softDeleteCustomer(id);
}

export async function restoreCustomer(id: string) {
  const client = requireClient();
  const { error } = await client.rpc('inventory_restore_customer', {
    p_customer_id: id,
  });
  if (error) throw error;
}

export async function fetchCustomerDeleteImpact(id: string): Promise<CustomerDeleteImpact> {
  const client = requireClient();
  const { data, error } = await client.rpc('inventory_customer_delete_impact', {
    p_customer_id: id,
  });
  if (error) throw error;
  return data as CustomerDeleteImpact;
}

export async function hardDeleteCustomer(id: string) {
  const client = requireClient();
  const { error } = await client.rpc('inventory_hard_delete_customer', {
    p_customer_id: id,
  });
  if (error) throw error;
}

export async function updateCustomersStatus(ids: string[], status: string) {
  if (!ids.length) return;
  const client = requireClient();
  const { error } = await client
    .from('inventory_customers')
    .update({ status })
    .in('id', ids)
    .is('deleted_at', null);
  if (error) throw error;
}

export async function deleteCustomers(ids: string[]) {
  if (!ids.length) return;
  for (const id of ids) {
    await softDeleteCustomer(id);
  }
}

export async function duplicateCustomers(customers: CustomerListRow[]) {
  if (!customers.length) return [];
  const client = requireClient();
  const ids: string[] = [];
  for (const customer of customers) {
    const name = `${customer.customerInfo.title} (Copy)`;
    let lastError: unknown;
    const id = crypto.randomUUID();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { error } = await client.from('inventory_customers').insert({
        id,
        code: generateCustomerCode(),
        name,
        email: null,
        image: customer.customerInfo.image,
        phone: customer.phone ?? null,
        company: customer.company ?? null,
        timezone: customer.timezone ?? null,
        billing_address: customer.billingAddress ?? null,
        vat_id: customer.vatId ?? null,
        location_name: customer.location.name || null,
        location_flag: customer.location.flag || null,
        status_color: customer.customerInfo.statusColor,
        verified: Boolean(customer.customerInfo.verified),
        order_count: '0',
        total_spent: 0,
        avg_price: parseMoney(customer.price),
        account_balance: 0,
        status: customer.status.label === 'Archived' ? 'Active' : customer.status.label,
        payment_methods: defaultPaymentMethods(name),
        reviews: customer.reviews ?? defaultCustomerReviews,
      });
      if (!error) {
        ids.push(id);
        lastError = null;
        break;
      }
      lastError = error;
      const message = String((error as { message?: string })?.message ?? '').toLowerCase();
      const code = String((error as { code?: string })?.code ?? '');
      const isCodeCollision =
        code === '23505' && (message.includes('code') || message.includes('inventory_customers_code'));
      if (!isCodeCollision) throw error;
    }
    if (lastError) throw lastError instanceof Error ? lastError : new Error('Unable to duplicate customer');
  }
  return ids;
}

async function resolveCarrierId(input: Pick<OrderInput, 'carrierId' | 'carrierName' | 'carrierLogo'>) {
  if (input.carrierId) return input.carrierId;
  if (!input.carrierName) return null;
  const client = requireClient();
  const { data } = await client
    .from('inventory_carriers')
    .select('id')
    .eq('name', input.carrierName)
    .maybeSingle();
  if (data?.id) return data.id as string;
  const carrierId = crypto.randomUUID();
  const { error } = await client.from('inventory_carriers').insert({
    id: carrierId,
    name: input.carrierName,
    logo: input.carrierLogo ?? 'ups.svg',
  });
  if (error) throw error;
  return carrierId;
}

function validateOrderItems(items: OrderItemInput[] | undefined, required: boolean) {
  if (!items || !items.length) {
    if (required) throw new Error('Order requires at least one line item');
    return;
  }
  for (const item of items) {
    if (!item.productId?.trim()) throw new Error('Product is required on each order line');
    assertNonNegativeQty(item.quantity, 'Quantity');
    if (item.quantity < 1) throw new Error('Quantity must be at least 1');
    assertNonNegativeMoney(item.price, 'Price');
  }
}

function orderItemsPayload(items: OrderItemInput[]) {
  return items.map((item) => ({
    product_id: item.productId,
    warehouse_id: item.warehouseId ?? null,
    category: item.category ?? null,
    price: item.price,
    quantity: item.quantity,
    color: item.color ?? null,
    weight: item.weight ?? null,
    product_name: item.productName ?? null,
    product_sku: item.productSku ?? null,
    product_image: item.productImage ?? null,
  }));
}

/** Exported for optimistic UI totals — uses store-aware pricing when options provided. */
export function orderPricing(
  items: OrderItemInput[] = [],
  options?: Parameters<typeof computeOrderPricing>[1],
) {
  return computeOrderPricing(items, options);
}

export async function createOrder(input: OrderInput) {
  const client = requireClient();
  validateOrderItems(input.items, true);
  const items = input.items!;
  const orderNumber = input.orderNumber?.trim() || generateOrderNumber();
  const deliveryStatus = normalizeDeliveryStatus(input.deliveryStatus);
  const paymentStatus = normalizePaymentStatus(input.paymentStatus);
  const firstName = input.customerName.split(' ')[0] || 'Customer';
  const carrierId = await resolveCarrierId(input);

  const payload = {
    id: crypto.randomUUID(),
    idempotency_key: input.idempotencyKey ?? null,
    order_number: orderNumber,
    date: input.date,
    customer_id: input.customerId ?? null,
    customer_name: input.customerName,
    category: input.category ?? null,
    payment_status: paymentStatus,
    delivery_status: deliveryStatus,
    carrier_id: carrierId,
    warehouse_id: input.warehouseId ?? null,
    store_id: input.storeId ?? import.meta.env.VITE_STORE_ID ?? null,
    shipping_priority: input.shippingPriority ?? null,
    delivery_method: input.deliveryMethod ?? null,
    origin_address: input.originAddress ?? null,
    destination_address: input.destinationAddress ?? null,
    shipping_label: input.shippingLabel ?? `Shipping to ${firstName}'s Home`,
    shipping_line1: input.shippingLine1 ?? null,
    shipping_line2: input.shippingLine2 ?? null,
    items: orderItemsPayload(items),
  };

  const { data, error } = await client.rpc('inventory_create_order', { payload });
  if (error) throw mapOrderError(error);
  const result = data as { id?: string } | null;
  if (!result?.id) throw new Error('Unable to create order');
  return result.id;
}

export async function updateOrder(id: string, input: Partial<OrderInput>) {
  const client = requireClient();
  if (input.items !== undefined) validateOrderItems(input.items, true);

  const payload: Record<string, unknown> = {};
  if (input.orderNumber !== undefined) payload.order_number = input.orderNumber;
  if (input.date !== undefined) payload.date = input.date;
  if (input.customerId !== undefined) payload.customer_id = input.customerId;
  if (input.customerName !== undefined) payload.customer_name = input.customerName;
  if (input.category !== undefined) payload.category = input.category;
  if (input.paymentStatus !== undefined) {
    payload.payment_status = normalizePaymentStatus(input.paymentStatus);
  }
  if (input.deliveryStatus !== undefined) {
    payload.delivery_status = normalizeDeliveryStatus(input.deliveryStatus);
  }
  if (input.carrierId !== undefined || input.carrierName !== undefined) {
    payload.carrier_id = await resolveCarrierId({
      carrierId: input.carrierId,
      carrierName: input.carrierName,
      carrierLogo: input.carrierLogo,
    });
  }
  if (input.warehouseId !== undefined) payload.warehouse_id = input.warehouseId;
  if (input.storeId !== undefined) payload.store_id = input.storeId;
  if (input.shippingPriority !== undefined) payload.shipping_priority = input.shippingPriority;
  if (input.deliveryMethod !== undefined) payload.delivery_method = input.deliveryMethod;
  if (input.originAddress !== undefined) payload.origin_address = input.originAddress;
  if (input.destinationAddress !== undefined) payload.destination_address = input.destinationAddress;
  if (input.shippingLabel !== undefined) payload.shipping_label = input.shippingLabel;
  if (input.shippingLine1 !== undefined) payload.shipping_line1 = input.shippingLine1;
  if (input.shippingLine2 !== undefined) payload.shipping_line2 = input.shippingLine2;
  if (input.items) payload.items = orderItemsPayload(input.items);

  if (isCanceledDelivery(input.deliveryStatus)) {
    const { error } = await client.rpc('inventory_cancel_order', {
      p_order_id: id,
      p_reason: 'Canceled via update',
    });
    if (error) throw mapOrderError(error);
    // Still apply non-status fields if any remain (items already blocked for cancel-only path).
    const { delivery_status: _d, payment_status: _p, ...rest } = payload;
    if (Object.keys(rest).length && !input.items) {
      const { error: updateError } = await client.rpc('inventory_update_order', {
        p_order_id: id,
        payload: rest,
      });
      if (updateError) throw mapOrderError(updateError);
    }
    return;
  }

  const { error } = await client.rpc('inventory_update_order', {
    p_order_id: id,
    payload,
  });
  if (error) throw mapOrderError(error);
}

/** Soft-cancel preferred path — releases reservation or restocks fulfilled qty. */
export async function cancelOrder(id: string, reason?: string) {
  const client = requireClient();
  const { error } = await client.rpc('inventory_cancel_order', {
    p_order_id: id,
    p_reason: reason ?? null,
  });
  if (error) throw mapOrderError(error);
}

/**
 * Hard delete only when the RPC allows it (not paid / not fulfilled).
 * Prefer {@link cancelOrder} from the UI.
 */
export async function deleteOrder(id: string) {
  const client = requireClient();
  const { error } = await client.rpc('inventory_delete_order', {
    p_order_id: id,
  });
  if (error) {
    // Fall back to soft-cancel so existing "Cancel Order" actions still succeed.
    const message = String(error.message ?? '').toLowerCase();
    if (message.includes('hard-delete') || message.includes('cancel it instead') || message.includes('fulfilled')) {
      await cancelOrder(id, 'Canceled from delete action');
      return;
    }
    throw mapOrderError(error);
  }
}

export async function updateOrderStatus(id: string, paymentStatus: string, deliveryStatus?: string) {
  const client = requireClient();
  if (deliveryStatus && isCanceledDelivery(deliveryStatus)) {
    await cancelOrder(id, 'Canceled via status update');
    if (normalizePaymentStatus(paymentStatus) !== 'Cancelled') {
      // payment already forced to Cancelled by cancel RPC
    }
    return;
  }
  const { error } = await client.rpc('inventory_update_order_status', {
    p_order_id: id,
    p_payment_status: normalizePaymentStatus(paymentStatus),
    p_delivery_status: deliveryStatus ? normalizeDeliveryStatus(deliveryStatus) : null,
  });
  if (error) throw mapOrderError(error);
}

export async function replaceVariants(productId: string, variants: ProductVariantRow[]) {
  const client = requireClient();
  validateProductVariants(variants);
  const { error } = await client.rpc('inventory_replace_product_variants', {
    p_product_id: productId,
    p_variants: variants.map((variant) => ({
      id: persistVariantId(variant.id),
      size: variant.size,
      color: variant.color,
      // Variant on_hand is display metadata only; warehouse stock is source of truth.
      on_hand: 0,
      price: parseMoney(variant.price),
      available: variant.available === 'Yes',
    })),
  });
  if (error) throw error;
}

export async function replaceOptions(productId: string, options: ProductOptionCard[]) {
  const client = requireClient();
  const { error } = await client.rpc('inventory_replace_product_options', {
    p_product_id: productId,
    p_options: options.map((option, index) => ({
      id: option.id.length > 20 ? option.id : crypto.randomUUID(),
      name: option.name,
      sort_order: index,
      values: option.values.map((value, valueIndex) => ({
        id: value.id.length > 20 ? value.id : crypto.randomUUID(),
        value: value.value,
        sort_order: valueIndex,
      })),
    })),
  });
  if (error) throw error;
}

export async function fetchBrands() {
  const client = requireClient();
  const { data, error } = await client.from('inventory_brands').select('*').order('name');
  if (error) throw error;
  return (data ?? []) as InventoryBrand[];
}

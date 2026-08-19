import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { buildOrderDetail } from '../data/orders';
import { formatMoney, generateCustomerCode, generateOrderNumber, parseMoney, parseQty, stableId } from '../lib/format';
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
  created_at: string;
  updated_at: string;
  category?: InventoryCategory | null;
  brand?: InventoryBrand | null;
  supplier?: InventorySupplier | null;
  stock_level?: InventoryStockLevel | null;
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
  product?: InventoryProduct | null;
  supplier?: InventorySupplier | null;
  carrier?: InventoryCarrier | null;
  warehouse?: InventoryWarehouse | null;
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
  customer?: InventoryCustomer | null;
  carrier?: InventoryCarrier | null;
  items?: InventoryOrderItem[];
  tracking_events?: InventoryTrackingEvent[];
};

export type InventoryOrderItem = {
  id: string;
  order_id: string;
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
  productId?: string | null;
  category?: string;
  price: number;
  quantity?: number;
  color?: string;
  weight?: string;
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
      label: product.status,
      variant: statusVariant(product.status),
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
    totalEarnings: formatMoney(category.total_earnings),
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

export function mapInbound(row: InventoryInboundShipment): InboundStockRow {
  return {
    id: row.id,
    productInfo: {
      title: row.product?.name ?? '',
      label: row.product?.sku ?? '',
      tooltip: row.product?.full_name ?? row.product?.name ?? '',
    },
    dateOrder: row.order_date,
    qty: row.qty,
    stock: formatMoney(row.stock_value),
    status: {
      label: row.status,
      variant: row.status_variant,
    },
    arrivalDate: row.arrival_date,
    carrier: row.carrier?.name ?? '',
    warehouse: row.warehouse?.code ?? '',
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
    updated: displayDate(row.updated_at),
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
  return {
    id: row.id,
    productInfo: {
      image: row.product?.image ?? '11.png',
      title: row.product?.name ?? '',
      label: row.product?.sku ?? '',
      tooltip: row.product?.full_name ?? row.product?.name ?? '',
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
    .order('created_at', { ascending: false });
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
    .order('name');
  if (error) throw error;
  return (data ?? []) as InventoryProduct[];
}

export async function fetchStockProducts() {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_products')
    .select(productSelect)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as InventoryProduct[];
}

export async function fetchInboundShipments() {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_inbound_shipments')
    .select(`*, product:inventory_products(*, supplier:inventory_suppliers(*)), supplier:inventory_suppliers(*), carrier:inventory_carriers(*), warehouse:inventory_warehouses(*)`)
    .order('arrival_date', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as InventoryInboundShipment[]).map(mapInbound);
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
    .order('updated_at', { ascending: false });
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

export async function fetchOrders() {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_orders')
    .select(`*, customer:inventory_customers(*), carrier:inventory_carriers(*)`)
    .order('date', { ascending: false });
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
  const productId = crypto.randomUUID();
  const { error } = await client.from('inventory_products').insert({
    id: productId,
    name: input.name,
    sku: input.sku,
    barcode: input.barcode ?? null,
    description: input.description ?? null,
    category_id: input.categoryId ?? null,
    brand_id: input.brandId ?? null,
    price: input.price ?? 0,
    status: input.status ?? 'Live',
    featured: Boolean(input.featured),
    tags: input.tags ?? [],
    image: input.image ?? '11.png',
    full_name: input.name,
  });
  if (error) throw error;

  await client.from('inventory_stock_levels').insert({
    id: crypto.randomUUID(),
    product_id: productId,
  });

  let warehouseId = input.warehouseId;
  if (!warehouseId) {
    const { data: defaultWarehouse } = await client
      .from('inventory_warehouses')
      .select('id')
      .eq('is_default', true)
      .maybeSingle();
    warehouseId = defaultWarehouse?.id;
  }
  if (warehouseId) {
    await client.rpc('inventory_set_warehouse_qty', {
      p_warehouse_id: warehouseId,
      p_product_id: productId,
      p_qty: 0,
    });
  }

  if (input.variants?.length) {
    const { error: variantError } = await client.from('inventory_product_variants').insert(
      input.variants.map((variant) => ({
        id: persistVariantId(variant.id),
        product_id: productId,
        size: variant.size,
        color: variant.color,
        on_hand: parseQty(variant.onHand),
        price: parseMoney(variant.price),
        available: variant.available === 'Yes',
      })),
    );
    if (variantError) throw variantError;
  }

  return productId;
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
  if (input.price !== undefined) payload.price = input.price;
  if (input.status !== undefined) payload.status = input.status;
  if (input.featured !== undefined) payload.featured = input.featured;
  if (input.tags !== undefined) payload.tags = input.tags;
  if (input.image !== undefined) payload.image = input.image;

  if (Object.keys(payload).length === 0) return;

  const { error } = await client.from('inventory_products').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteProduct(id: string) {
  const client = requireClient();
  const { error } = await client.from('inventory_products').delete().eq('id', id);
  if (error) throw error;
}

export async function createCategory(input: {
  name: string;
  status?: string;
  featured?: boolean;
  description?: string;
  icon?: string;
}) {
  const client = requireClient();
  const id = crypto.randomUUID();
  const { error } = await client.from('inventory_categories').insert({
    id,
    name: input.name,
    status: input.status ?? 'Active',
    featured: Boolean(input.featured),
    description: input.description ?? null,
    icon: input.icon ?? 'running-shoes.svg',
    code: stableId('code', input.name).replace('code_', '').slice(0, 12).toUpperCase(),
  });
  if (error) throw error;
  return id;
}

export async function updateCategory(
  id: string,
  input: Partial<{ name: string; status: string; featured: boolean; description: string; icon: string }>,
) {
  const client = requireClient();
  const { error } = await client.from('inventory_categories').update(input).eq('id', id);
  if (error) throw error;
}

export async function deleteCategory(id: string) {
  const client = requireClient();
  const { error } = await client.from('inventory_categories').delete().eq('id', id);
  if (error) throw error;
}

export async function updateStockLevel(
  productId: string,
  input: Partial<InventoryStockLevel> & { warehouseId?: string },
) {
  const client = requireClient();
  const warehouseId = input.warehouseId;
  const { warehouseId: _warehouseId, ...stockPayload } = input;
  if (warehouseId && stockPayload.qty !== undefined) {
    const { error: qtyError } = await client.rpc('inventory_set_warehouse_qty', {
      p_warehouse_id: warehouseId,
      p_product_id: productId,
      p_qty: stockPayload.qty,
    });
    if (qtyError) throw qtyError;
  }
  const payload: Record<string, unknown> = { ...stockPayload };
  delete payload.warehouseId;
  if (warehouseId && stockPayload.qty !== undefined) {
    delete payload.qty;
  }
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

export async function deleteInboundShipment(id: string) {
  const client = requireClient();
  const { error } = await client.rpc('inventory_delete_inbound_shipment', {
    p_id: id,
  });
  if (error) throw error;
}

export async function deleteOutboundShipment(id: string) {
  const client = requireClient();
  const { error } = await client.from('inventory_outbound_shipments').delete().eq('id', id);
  if (error) throw error;
}

export async function createCustomer(input: CustomerInput) {
  const client = requireClient();
  const location = locationProfile(input.locationName);
  const name = input.name.trim();
  const email = input.email?.trim() || null;
  const id = crypto.randomUUID();
  const { error } = await client.from('inventory_customers').insert({
    id,
    code: generateCustomerCode(),
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
    payment_methods: input.paymentMethods ?? defaultPaymentMethods(name, email),
    reviews: input.reviews ?? defaultCustomerReviews,
  });
  if (error) throw error;
  return id;
}

export async function updateCustomer(id: string, input: Partial<CustomerInput>) {
  const client = requireClient();
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name;
  if (input.email !== undefined) payload.email = input.email || null;
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
  const { error } = await client.from('inventory_customers').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteCustomer(id: string) {
  const client = requireClient();
  const { error } = await client.from('inventory_customers').delete().eq('id', id);
  if (error) throw error;
}

export async function updateCustomersStatus(ids: string[], status: string) {
  if (!ids.length) return;
  const client = requireClient();
  const { error } = await client.from('inventory_customers').update({ status }).in('id', ids);
  if (error) throw error;
}

export async function deleteCustomers(ids: string[]) {
  if (!ids.length) return;
  const client = requireClient();
  const { error } = await client.from('inventory_customers').delete().in('id', ids);
  if (error) throw error;
}

export async function duplicateCustomers(customers: CustomerListRow[]) {
  if (!customers.length) return [];
  const client = requireClient();
  const rows = customers.map((customer) => {
    const name = `${customer.customerInfo.title} (Copy)`;
    return {
      id: crypto.randomUUID(),
      code: generateCustomerCode(),
      name,
      email: customer.customerInfo.label || null,
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
      status: customer.status.label,
      payment_methods: defaultPaymentMethods(name, customer.customerInfo.label),
      reviews: customer.reviews ?? defaultCustomerReviews,
    };
  });
  const { error } = await client.from('inventory_customers').insert(rows);
  if (error) throw error;
  return rows.map((row) => row.id);
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

function orderPricing(items: OrderItemInput[] = []) {
  const subtotal = items.reduce((sum, item) => sum + item.price * (item.quantity ?? 1), 0);
  const shippingCost = items.length ? 10 : 0;
  const tax = items.length ? 20 : 0;
  return { subtotal, shippingCost, tax, total: subtotal + shippingCost + tax };
}

async function insertOrderItems(orderId: string, items: OrderItemInput[]) {
  if (!items.length) return;
  const client = requireClient();
  const { error } = await client.from('inventory_order_items').insert(
    items.map((item) => ({
      id: crypto.randomUUID(),
      order_id: orderId,
      product_id: item.productId ?? null,
      category: item.category ?? null,
      price: item.price,
      quantity: item.quantity ?? 1,
      color: item.color ?? null,
      weight: item.weight ?? null,
      trend_label: 'Steady',
      trend_variant: 'secondary',
      stock: 0,
      reserved: 0,
      threshold_level: 0,
    })),
  );
  if (error) throw error;
}

export async function createOrder(input: OrderInput) {
  const client = requireClient();
  const orderId = crypto.randomUUID();
  const items = input.items ?? [];
  const pricing = orderPricing(items);
  const firstName = input.customerName.split(' ')[0] || 'Customer';
  const orderNumber = input.orderNumber?.trim() || generateOrderNumber();
  const deliveryStatus = input.deliveryStatus ?? 'Pending';
  const paymentStatus = input.paymentStatus ?? 'Unpaid';
  const detail = buildOrderDetail({
    id: orderId,
    order: orderNumber,
    date: input.date,
    customer: input.customerName,
    total: formatMoney(pricing.total),
    items: items.length,
    category: input.category ?? '',
    deliveryStatus: { label: deliveryStatus, variant: statusVariant(deliveryStatus) },
    paymentStatus: { label: paymentStatus, variant: statusVariant(paymentStatus) },
    carrier: { name: input.carrierName ?? '', logo: input.carrierLogo ?? 'ups.svg' },
  });
  const { error } = await client.from('inventory_orders').insert({
    id: orderId,
    order_number: orderNumber,
    date: input.date,
    customer_id: input.customerId ?? null,
    customer_name: input.customerName,
    total: pricing.total,
    item_count: items.length,
    category: input.category ?? null,
    delivery_status: deliveryStatus,
    delivery_status_variant: statusVariant(deliveryStatus),
    payment_status: paymentStatus,
    payment_status_variant: statusVariant(paymentStatus),
    carrier_id: await resolveCarrierId(input),
    subtotal: pricing.subtotal,
    shipping_cost: pricing.shippingCost,
    tax: pricing.tax,
    shipment_number: detail.shipmentNumber,
    tracking_number: detail.trackingNumber,
    shipping_priority: input.shippingPriority ?? detail.shippingPriority,
    delivery_method: input.deliveryMethod ?? detail.deliveryMethod,
    current_step: detail.currentStep,
    origin_address: input.originAddress ?? detail.originAddress,
    destination_address: input.destinationAddress ?? detail.destinationAddress,
    shipping_label: input.shippingLabel ?? `Shipping to ${firstName}'s Home`,
    shipping_line1: input.shippingLine1 ?? detail.shippingLine1,
    shipping_line2: input.shippingLine2 ?? detail.shippingLine2,
    total_time: detail.totalTime,
    departure_time: detail.departureTime,
    expected_arrival: detail.expectedArrival,
  });
  if (error) throw error;
  await insertOrderItems(orderId, items);
  if (detail.trackingEvents.length) {
    const { error: eventError } = await client.from('inventory_order_tracking_events').insert(
      detail.trackingEvents.map((event, index) => ({
        id: crypto.randomUUID(),
        order_id: orderId,
        title: event.title,
        date: event.date,
        description: event.description,
        location: event.location ?? null,
        sort_order: event.sortOrder ?? index,
      })),
    );
    if (eventError) throw eventError;
  }
  return orderId;
}

export async function updateOrder(id: string, input: Partial<OrderInput>) {
  const client = requireClient();
  const payload: Record<string, unknown> = {};
  if (input.orderNumber !== undefined) payload.order_number = input.orderNumber;
  if (input.date !== undefined) payload.date = input.date;
  if (input.customerId !== undefined) payload.customer_id = input.customerId;
  if (input.customerName !== undefined) payload.customer_name = input.customerName;
  if (input.category !== undefined) payload.category = input.category;
  if (input.paymentStatus !== undefined) {
    payload.payment_status = input.paymentStatus;
    payload.payment_status_variant = statusVariant(input.paymentStatus);
  }
  if (input.deliveryStatus !== undefined) {
    payload.delivery_status = input.deliveryStatus;
    payload.delivery_status_variant = statusVariant(input.deliveryStatus);
  }
  if (input.carrierId !== undefined || input.carrierName !== undefined) {
    payload.carrier_id = await resolveCarrierId({
      carrierId: input.carrierId,
      carrierName: input.carrierName,
      carrierLogo: input.carrierLogo,
    });
  }
  if (input.shippingPriority !== undefined) payload.shipping_priority = input.shippingPriority;
  if (input.deliveryMethod !== undefined) payload.delivery_method = input.deliveryMethod;
  if (input.originAddress !== undefined) payload.origin_address = input.originAddress;
  if (input.destinationAddress !== undefined) payload.destination_address = input.destinationAddress;
  if (input.shippingLabel !== undefined) payload.shipping_label = input.shippingLabel;
  if (input.shippingLine1 !== undefined) payload.shipping_line1 = input.shippingLine1;
  if (input.shippingLine2 !== undefined) payload.shipping_line2 = input.shippingLine2;
  if (input.items) {
    const pricing = orderPricing(input.items);
    payload.subtotal = pricing.subtotal;
    payload.shipping_cost = pricing.shippingCost;
    payload.tax = pricing.tax;
    payload.total = pricing.total;
    payload.item_count = input.items.length;
  }
  if (Object.keys(payload).length) {
    const { error } = await client.from('inventory_orders').update(payload).eq('id', id);
    if (error) throw error;
  }
  if (input.items) {
    const { error: deleteError } = await client.from('inventory_order_items').delete().eq('order_id', id);
    if (deleteError) throw deleteError;
    await insertOrderItems(id, input.items);
  }
}

export async function deleteOrder(id: string) {
  const client = requireClient();
  const { error } = await client.from('inventory_orders').delete().eq('id', id);
  if (error) throw error;
}

export async function updateOrderStatus(id: string, paymentStatus: string, deliveryStatus?: string) {
  const client = requireClient();
  const { error } = await client
    .from('inventory_orders')
    .update({
      payment_status: paymentStatus,
      payment_status_variant: statusVariant(paymentStatus),
      ...(deliveryStatus
        ? {
            delivery_status: deliveryStatus,
            delivery_status_variant: statusVariant(deliveryStatus),
          }
        : {}),
    })
    .eq('id', id);
  if (error) throw error;
}

export async function replaceVariants(productId: string, variants: ProductVariantRow[]) {
  const client = requireClient();
  const { error: deleteError } = await client
    .from('inventory_product_variants')
    .delete()
    .eq('product_id', productId);
  if (deleteError) throw deleteError;
  if (!variants.length) return;
  const { error } = await client.from('inventory_product_variants').insert(
    variants.map((variant) => ({
      id: persistVariantId(variant.id),
      product_id: productId,
      size: variant.size,
      color: variant.color,
      on_hand: parseQty(variant.onHand),
      price: parseMoney(variant.price),
      available: variant.available === 'Yes',
    })),
  );
  if (error) throw error;
}

export async function replaceOptions(productId: string, options: ProductOptionCard[]) {
  const client = requireClient();
  const { error: deleteError } = await client
    .from('inventory_product_options')
    .delete()
    .eq('product_id', productId);
  if (deleteError) throw deleteError;

  for (const [index, option] of options.entries()) {
    const optionId = option.id.length > 20 ? option.id : crypto.randomUUID();
    const { error } = await client.from('inventory_product_options').insert({
      id: optionId,
      product_id: productId,
      name: option.name,
      sort_order: index,
    });
    if (error) throw error;
    if (!option.values.length) continue;
    const { error: valueError } = await client.from('inventory_product_option_values').insert(
      option.values.map((value, valueIndex) => ({
        id: value.id.length > 20 ? value.id : crypto.randomUUID(),
        option_id: optionId,
        value: value.value,
        sort_order: valueIndex,
      })),
    );
    if (valueError) throw valueError;
  }
}

export async function fetchBrands() {
  const client = requireClient();
  const { data, error } = await client.from('inventory_brands').select('*').order('name');
  if (error) throw error;
  return (data ?? []) as InventoryBrand[];
}

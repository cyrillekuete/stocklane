import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { categoryListMockData } from '../src/store-inventory/data/categories';
import {
  companyFromName,
  defaultCustomerReviews,
  defaultPaymentMethods,
  locationProfile,
  parseMockDate,
} from '../src/store-inventory/data/customer-profile';
import { customerListMockData } from '../src/store-inventory/data/customers';
import {
  allOrderListMockData,
  buildOrderDetail,
  orderDetailItemsByNumber,
  orderItemsMockData,
} from '../src/store-inventory/data/orders';
import { productListMockData } from '../src/store-inventory/data/products';
import {
  allStockMockData,
  currentStockMockData,
  inboundStockMockData,
  outboundStockMockData,
  stockPlannerMockData,
} from '../src/store-inventory/data/stock';
import { defaultProductOptions, defaultProductVariants } from '../src/store-inventory/data/variants';
import { warehouseListMockData } from '../src/store-inventory/data/warehouses';
import { defaultStoreSettings, storeSettingsToRow } from '../src/store-inventory/data/settings';
import { parseMoney, parseQty, stableId } from '../src/store-inventory/lib/format';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL and a Supabase key for seeding.');
}

const supabase = createClient(url, key);

async function upsert(table: string, rows: Record<string, unknown>[], onConflict = 'id') {
  if (!rows.length) return;
  const { error } = await supabase.from(table).upsert(rows, { onConflict });
  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }
}

function ensureProduct(sku: string, name: string, extra: Record<string, unknown> = {}) {
  const id = stableId('prod', sku);
  return {
    id,
    sku,
    name,
    full_name: extra.full_name ?? name,
    image: extra.image ?? null,
    price: extra.price ?? 0,
    status: extra.status ?? 'Live',
    category_id: extra.category_id ?? null,
    supplier_id: extra.supplier_id ?? null,
    featured: extra.featured ?? false,
    tags: extra.tags ?? [],
  };
}

async function main() {
  const categoryByName = new Map<string, string>();
  const usedCategoryCodes = new Set<string>();
  const uniqueCategoryCode = (code?: string | null, fallback?: string) => {
    if (!code) return null;
    if (!usedCategoryCodes.has(code)) {
      usedCategoryCodes.add(code);
      return code;
    }
    const next = fallback ? `${code}-${fallback}` : `${code}-${usedCategoryCodes.size + 1}`;
    usedCategoryCodes.add(next);
    return next;
  };
  const categories = categoryListMockData.map((row) => {
    const id = stableId('cat', row.productInfo.title);
    categoryByName.set(row.productInfo.title, id);
    return {
      id,
      name: row.productInfo.title,
      code: uniqueCategoryCode(row.productInfo.label, row.productInfo.title),
      icon: row.productInfo.image,
      status: row.status.label,
      featured: row.featured,
      total_earnings: parseMoney(row.totalEarnings),
    };
  });

  const extraCategoryNames = [
    ...productListMockData.map((row) => row.category),
    ...allStockMockData.map((row) => row.category),
  ];
  for (const name of extraCategoryNames) {
    if (!name || categoryByName.has(name)) continue;
    const id = stableId('cat', name);
    categoryByName.set(name, id);
    categories.push({
      id,
      name,
      code: null as unknown as string,
      icon: null as unknown as string,
      status: 'Active',
      featured: false,
      total_earnings: 0,
    });
  }

  const suppliers = new Map<string, { id: string; name: string; logo: string | null }>();
  const addSupplier = (name?: string, logo?: string) => {
    if (!name) return null;
    if (!suppliers.has(name)) {
      suppliers.set(name, { id: stableId('sup', name), name, logo: logo ?? null });
    }
    return suppliers.get(name)!.id;
  };

  for (const row of allStockMockData) addSupplier(row.supplier.name, row.supplier.logo);
  for (const row of inboundStockMockData) addSupplier(row.supplier.name, row.supplier.logo);
  for (const row of orderItemsMockData) addSupplier(row.supplier.name, row.supplier.logo);

  const warehouses = new Map<
    string,
    {
      id: string;
      code: string;
      name: string;
      address: string | null;
      city: string | null;
      country: string | null;
      phone: string | null;
      status: string;
      is_default: boolean;
    }
  >();
  const addWarehouse = (code?: string, extra?: Partial<{
    name: string;
    address: string | null;
    city: string | null;
    country: string | null;
    phone: string | null;
    status: string;
    is_default: boolean;
  }>) => {
    if (!code) return null;
    const existingKey = [...warehouses.keys()].find((key) => key.toLowerCase() === code.toLowerCase());
    if (existingKey) {
      if (extra) warehouses.set(existingKey, { ...warehouses.get(existingKey)!, ...extra, code: warehouses.get(existingKey)!.code });
      return warehouses.get(existingKey)!.id;
    }
    warehouses.set(code, {
      id: stableId('wh', code),
      code,
      name: extra?.name ?? code,
      address: extra?.address ?? null,
      city: extra?.city ?? null,
      country: extra?.country ?? null,
      phone: extra?.phone ?? null,
      status: extra?.status ?? 'Active',
      is_default: extra?.is_default ?? false,
    });
    return warehouses.get(code)!.id;
  };
  for (const row of warehouseListMockData) {
    addWarehouse(row.code, {
      name: row.name,
      address: row.address,
      city: row.city,
      country: row.country,
      phone: row.phone,
      status: row.status.label,
      is_default: row.isDefault,
    });
  }
  for (const row of outboundStockMockData) addWarehouse(row.warehouse);
  if (!warehouses.size) {
    addWarehouse('MAIN', { name: 'Main Warehouse', is_default: true });
  }
  const defaultWarehouse =
    [...warehouses.values()].find((row) => row.is_default) ?? [...warehouses.values()][0];
  if (defaultWarehouse) {
    for (const row of warehouses.values()) row.is_default = false;
    defaultWarehouse.is_default = true;
  }

  const carriers = new Map<string, { id: string; name: string; logo: string | null }>();
  const addCarrier = (name?: string, logo?: string) => {
    if (!name) return null;
    if (!carriers.has(name)) {
      carriers.set(name, { id: stableId('car', name), name, logo: logo ?? null });
    }
    return carriers.get(name)!.id;
  };
  for (const row of inboundStockMockData) addCarrier(row.carrier);
  for (const row of outboundStockMockData) addCarrier(row.carrier);
  for (const row of allOrderListMockData) addCarrier(row.carrier.name, row.carrier.logo);

  const brands = ['Apple', 'Sony', 'Brand'].map((name) => ({
    id: stableId('brand', name),
    name,
  }));

  const products = new Map<string, ReturnType<typeof ensureProduct>>();
  const resolveSku = (label: string) => {
    if (!label) return label;
    if (products.has(label)) return label;
    return [...products.keys()].find((sku) => sku.startsWith(label) || label.startsWith(sku)) ?? label;
  };
  const rememberProduct = (sku: string, name: string, extra: Record<string, unknown> = {}) => {
    if (!sku) return;
    const resolved = resolveSku(sku);
    if (!products.has(resolved)) {
      products.set(resolved, ensureProduct(resolved, name, extra));
    } else {
      const current = products.get(resolved)!;
      products.set(resolved, { ...current, ...extra, sku: resolved, name: current.name || name });
    }
  };

  for (const row of productListMockData) {
    rememberProduct(row.productInfo.label, row.productInfo.title, {
      full_name: row.productInfo.tooltip || row.productInfo.title,
      image: row.productInfo.image,
      price: parseMoney(row.price),
      status: row.status.label,
      category_id: categoryByName.get(row.category) ?? null,
    });
  }
  for (const row of allStockMockData) {
    rememberProduct(row.productInfo.label, row.productInfo.tooltip || row.productInfo.title, {
      full_name: row.productInfo.tooltip || row.productInfo.title,
      image: row.productInfo.image,
      price: parseMoney(row.price),
      category_id: categoryByName.get(row.category) ?? null,
      supplier_id: addSupplier(row.supplier.name, row.supplier.logo),
    });
  }
  for (const row of currentStockMockData) {
    rememberProduct(row.productInfo.label, row.productInfo.tooltip || row.productInfo.title, {
      image: row.productInfo.image,
      full_name: row.productInfo.tooltip || row.productInfo.title,
    });
  }
  for (const row of inboundStockMockData) {
    rememberProduct(row.productInfo.label, row.productInfo.tooltip || row.productInfo.title);
  }
  for (const row of outboundStockMockData) {
    rememberProduct(row.productInfo.label, row.productInfo.tooltip || row.productInfo.title);
  }
  for (const row of stockPlannerMockData) {
    rememberProduct(row.productInfo.label, row.productInfo.tooltip || row.productInfo.title, {
      image: row.productInfo.image,
    });
  }
  for (const row of orderItemsMockData) {
    rememberProduct(row.productInfo.label, row.productInfo.tooltip || row.productInfo.title, {
      image: row.productInfo.image,
      price: parseMoney(row.price),
      category_id: categoryByName.get(row.category) ?? null,
      supplier_id: addSupplier(row.supplier.name, row.supplier.logo),
    });
  }
  for (const items of Object.values(orderDetailItemsByNumber)) {
    for (const item of items) {
      rememberProduct(item.sku, item.title, {
        image: item.image,
        full_name: item.title,
      });
    }
  }

  const stockLevels = new Map<string, Record<string, unknown>>();
  const mergeStock = (sku: string, patch: Record<string, unknown>) => {
    const resolved = resolveSku(sku);
    const productId = stableId('prod', resolved);
    const current = stockLevels.get(productId) ?? {
      id: stableId('stock', resolved),
      product_id: productId,
    };
    stockLevels.set(productId, { ...current, ...patch });
  };

  for (const row of allStockMockData) {
    mergeStock(row.productInfo.label, {
      qty: row.stockFlow.number1,
      inbound_qty: row.stockFlow.number2,
      outbound_qty: row.stockFlow.number3,
      delta_label: row.delta.label,
      delta_variant: row.delta.variant,
    });
  }
  for (const row of currentStockMockData) {
    mergeStock(row.productInfo.label, {
      qty: row.stock,
      reserved: row.rsvd,
      threshold: row.tlvl,
      delta_label: row.delta.label,
      delta_variant: row.delta.variant,
      total_value: parseMoney(row.sum),
      last_moved: row.lastMoved,
      handler: row.handler,
      trend_label: row.trend.label,
      trend_variant: row.trend.variant,
    });
  }
  for (const row of stockPlannerMockData) {
    mergeStock(row.productInfo.label, {
      qty: Math.round(row.stock),
      reserved: Math.round(row.rsvd),
      threshold: Math.round(row.tlvl),
      delta_label: row.delta.label,
      delta_variant: row.delta.variant,
      flow_rate: Math.round(Number(row.flow)),
      reorder_qty: row.reorder,
      reorder_in_days: row.reorderIn.days,
      reorder_date: row.reorderIn.date,
      lead_time_days: row.leadTime.days,
      lead_time_date: row.leadTime.date,
      auto_reorder: row.ar,
    });
  }

  const inbound = inboundStockMockData.map((row, index) => {
    const sku = resolveSku(row.productInfo.label);
    return {
      id: stableId('inb', `${sku}_${index}`),
      product_id: stableId('prod', sku),
      supplier_id: addSupplier(row.supplier.name, row.supplier.logo),
      carrier_id: addCarrier(row.carrier),
      order_date: row.dateOrder,
      qty: row.qty,
      stock_value: parseMoney(row.stock),
      status: row.status.label,
      status_variant: row.status.variant,
      arrival_date: row.arrivalDate,
      warehouse_id: defaultWarehouse?.id ?? null,
    };
  });

  const outbound = outboundStockMockData.map((row, index) => {
    const sku = resolveSku(row.productInfo.label);
    return {
      id: stableId('out', `${row.dateOrder}_${index}`),
      product_id: stableId('prod', sku),
      warehouse_id: addWarehouse(row.warehouse),
      carrier_id: addCarrier(row.carrier),
      order_ref: row.dateOrder,
      qty: parseQty(row.qty),
      status: row.status.label,
      status_variant: row.status.variant,
      expected_delivery: row.expDelivery,
      notify: Boolean(row.notify),
    };
  });

  const customers = customerListMockData.map((row) => {
    const location = locationProfile(row.location.name);
    const digits = row.user.replace(/\D/g, '').slice(0, 8).padEnd(8, '6');
    const lastVisit = parseMockDate(row.updated);
    return {
      id: stableId('cust', row.user),
      code: row.user,
      name: row.customerInfo.title,
      email: row.customerInfo.label,
      image: row.customerInfo.image,
      phone: `${location.dial} ${digits}`,
      company: companyFromName(row.customerInfo.title),
      timezone: location.timezone,
      billing_address: `${location.city}, ${row.location.name}`,
      vat_id: `${location.vatPrefix}${digits}B01`,
      location_name: row.location.name,
      location_flag: row.location.flag,
      status_color: row.customerInfo.statusColor,
      verified: Boolean(row.customerInfo.verified),
      order_count: row.created,
      total_spent: parseMoney(row.total),
      avg_price: parseMoney(row.price),
      account_balance: 0,
      status: row.status.label,
      last_visit: lastVisit,
      payment_methods: defaultPaymentMethods(row.customerInfo.title, row.customerInfo.label),
      reviews: defaultCustomerReviews,
    };
  });

  const customerByName = new Map(customers.map((row) => [row.name, row.id]));

  const orders = allOrderListMockData.map((row, index) => {
    const matchedId = customerByName.get(row.customer);
    const fallback = customers[index % customers.length];
    const customerId = matchedId ?? fallback?.id ?? null;
    const customerName = matchedId ? row.customer : fallback?.name ?? row.customer;
    const detail = buildOrderDetail({ ...row, customer: customerName });
    return {
      id: stableId('ord', row.order),
      order_number: row.order,
      date: row.date,
      customer_id: customerId,
      customer_name: customerName,
      total: parseMoney(detail.total),
      item_count: detail.detailItems.length || row.items,
      category: row.category,
      delivery_status: row.deliveryStatus.label,
      delivery_status_variant: row.deliveryStatus.variant,
      payment_status: row.paymentStatus.label,
      payment_status_variant: row.paymentStatus.variant,
      carrier_id: addCarrier(row.carrier.name, row.carrier.logo),
      subtotal: parseMoney(detail.subtotal),
      shipping_cost: parseMoney(detail.shippingCost),
      tax: parseMoney(detail.tax),
      shipment_number: detail.shipmentNumber,
      tracking_number: detail.trackingNumber,
      shipping_priority: detail.shippingPriority,
      delivery_method: detail.deliveryMethod,
      current_step: detail.currentStep,
      origin_address: detail.originAddress,
      destination_address: detail.destinationAddress,
      shipping_label: detail.shippingLabel,
      shipping_line1: detail.shippingLine1,
      shipping_line2: detail.shippingLine2,
      total_time: detail.totalTime,
      departure_time: detail.departureTime,
      expected_arrival: detail.expectedArrival,
    };
  });

  const orderItems = allOrderListMockData.flatMap((row) => {
    const orderId = stableId('ord', row.order);
    const detail = buildOrderDetail(row);
    const overlayItems = orderDetailItemsByNumber[row.order];
    if (overlayItems?.length) {
      return overlayItems.map((item, itemIndex) => {
        const mock = orderItemsMockData.find((entry) => entry.productInfo.label === item.sku) ?? orderItemsMockData[itemIndex % orderItemsMockData.length];
        return {
          id: stableId('oi', `${orderId}_${item.sku}`),
          order_id: orderId,
          product_id: stableId('prod', resolveSku(item.sku)),
          category: mock.category,
          price: parseMoney(mock.price) || parseMoney(detail.subtotal) / overlayItems.length,
          quantity: 1,
          color: item.color,
          weight: item.weight,
          trend_label: mock.trends.label,
          trend_variant: mock.trends.variant,
          stock: mock.stock,
          reserved: mock.reserved,
          threshold_level: mock.thresholdLevel,
        };
      });
    }
    const count = Math.max(row.items, 1);
    return Array.from({ length: count }, (_, itemIndex) => {
      const mock = orderItemsMockData[itemIndex % orderItemsMockData.length];
      return {
        id: stableId('oi', `${orderId}_${mock.productInfo.label}_${itemIndex}`),
        order_id: orderId,
        product_id: stableId('prod', resolveSku(mock.productInfo.label)),
        category: mock.category,
        price: parseMoney(mock.price),
        quantity: 1,
        color: mock.color ?? 'Black',
        weight: mock.weight ?? '1.0',
        trend_label: mock.trends.label,
        trend_variant: mock.trends.variant,
        stock: mock.stock,
        reserved: mock.reserved,
        threshold_level: mock.thresholdLevel,
      };
    });
  });

  const trackingEvents = allOrderListMockData.flatMap((row) => {
    const orderId = stableId('ord', row.order);
    const detail = buildOrderDetail(row);
    return detail.trackingEvents.map((event, eventIndex) => ({
      id: stableId('ote', `${row.order}_${event.title}_${eventIndex}`),
      order_id: orderId,
      title: event.title,
      date: event.date,
      description: event.description,
      location: event.location ?? null,
      sort_order: event.sortOrder ?? eventIndex,
    }));
  });

  const firstProduct = [...products.values()][0];
  const variants = firstProduct
    ? defaultProductVariants.map((row) => ({
        id: stableId('var', `${firstProduct.sku}_${row.id}`),
        product_id: firstProduct.id,
        size: row.size,
        color: row.color,
        on_hand: parseQty(row.onHand),
        price: parseMoney(row.price),
        available: row.available === 'Yes',
      }))
    : [];

  const options = firstProduct
    ? defaultProductOptions.map((option, optionIndex) => ({
        id: stableId('opt', `${firstProduct.sku}_${option.id}`),
        product_id: firstProduct.id,
        name: option.name,
        sort_order: optionIndex,
      }))
    : [];

  const optionValues = firstProduct
    ? defaultProductOptions.flatMap((option, optionIndex) =>
        option.values.map((value, valueIndex) => ({
          id: stableId('optv', `${firstProduct.sku}_${option.id}_${value.id}`),
          option_id: stableId('opt', `${firstProduct.sku}_${option.id}`),
          value: value.value,
          sort_order: valueIndex + optionIndex * 10,
        })),
      )
    : [];

  await upsert('inventory_store_settings', [storeSettingsToRow(defaultStoreSettings)]);
  await upsert('inventory_categories', categories as Record<string, unknown>[]);
  await upsert('inventory_suppliers', [...suppliers.values()]);
  await upsert('inventory_warehouses', [...warehouses.values()].map((row) => ({ ...row, is_default: false })));
  if (defaultWarehouse) {
    await supabase.from('inventory_warehouses').update({ is_default: false }).eq('is_default', true);
    const { error: defaultError } = await supabase
      .from('inventory_warehouses')
      .update({ is_default: true })
      .eq('id', defaultWarehouse.id);
    if (defaultError) throw new Error(`inventory_warehouses default: ${defaultError.message}`);
  }
  await upsert('inventory_carriers', [...carriers.values()]);
  await upsert('inventory_brands', brands);
  await upsert('inventory_products', [...products.values()] as Record<string, unknown>[]);
  await upsert('inventory_stock_levels', [...stockLevels.values()]);
  const warehouseStock = [...stockLevels.values()].map((row) => ({
    id: stableId('whs', `${defaultWarehouse?.id ?? 'main'}_${row.product_id}`),
    warehouse_id: defaultWarehouse?.id ?? stableId('wh', 'MAIN'),
    product_id: row.product_id,
    qty: Number(row.qty) || 0,
    reserved: Number(row.reserved) || 0,
  }));
  await upsert('inventory_warehouse_stock', warehouseStock, 'warehouse_id,product_id');
  await upsert('inventory_inbound_shipments', inbound);
  await upsert('inventory_outbound_shipments', outbound);
  await upsert('inventory_customers', customers);
  await upsert('inventory_orders', orders);
  await upsert('inventory_order_items', orderItems);
  await upsert('inventory_order_tracking_events', trackingEvents);
  await upsert('inventory_product_variants', variants);
  await upsert('inventory_product_options', options);
  await upsert('inventory_product_option_values', optionValues);
  await supabase.from('inventory_products').delete().eq('sku', 'WM-842');

  console.log(`Seeded ${products.size} products, ${categories.length} categories, ${customers.length} customers, ${orders.length} orders, ${orderItems.length} order items, ${trackingEvents.length} tracking events.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

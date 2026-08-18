export const inventoryKeys = {
  all: ['inventory'] as const,
  products: () => [...inventoryKeys.all, 'products'] as const,
  product: (id: string) => [...inventoryKeys.all, 'product', id] as const,
  categories: () => [...inventoryKeys.all, 'categories'] as const,
  categoryProducts: (categoryId?: string) =>
    categoryId
      ? ([...inventoryKeys.all, 'category-products', categoryId] as const)
      : ([...inventoryKeys.all, 'category-products'] as const),
  brands: () => [...inventoryKeys.all, 'brands'] as const,
  stock: () => [...inventoryKeys.all, 'stock'] as const,
  inbound: () => [...inventoryKeys.all, 'inbound'] as const,
  outbound: () => [...inventoryKeys.all, 'outbound'] as const,
  customers: () => [...inventoryKeys.all, 'customers'] as const,
  customer: (id: string) => [...inventoryKeys.all, 'customer', id] as const,
  customerOrders: (customerId?: string) =>
    customerId
      ? ([...inventoryKeys.all, 'customer-orders', customerId] as const)
      : ([...inventoryKeys.all, 'customer-orders'] as const),
  orders: () => [...inventoryKeys.all, 'orders'] as const,
  order: (id: string) => [...inventoryKeys.all, 'order', id] as const,
  orderItems: (orderId?: string) =>
    orderId
      ? ([...inventoryKeys.all, 'order-items', orderId] as const)
      : ([...inventoryKeys.all, 'order-items'] as const),
  orderTracking: (orderId?: string) =>
    orderId
      ? ([...inventoryKeys.all, 'order-tracking', orderId] as const)
      : ([...inventoryKeys.all, 'order-tracking'] as const),
  carriers: () => [...inventoryKeys.all, 'carriers'] as const,
  variants: (productId?: string) =>
    productId
      ? ([...inventoryKeys.all, 'variants', productId] as const)
      : ([...inventoryKeys.all, 'variants'] as const),
  options: (productId?: string) =>
    productId
      ? ([...inventoryKeys.all, 'options', productId] as const)
      : ([...inventoryKeys.all, 'options'] as const),
  settings: () => [...inventoryKeys.all, 'settings'] as const,
};

export const REFERENCE_STALE_TIME = 5 * 60_000;

import { isSupabaseConfigured } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { withCustomerProfile } from '../data/customer-profile';
import { formatMoney } from '../lib/format';
import {
  invalidateKeys,
  patchListById,
  patchListByIds,
  patchQueryData,
  prependToList,
  removeFromList,
  replaceListItemId,
  restoreQueries,
  snapshotQueries,
  toastMutationError,
  type QuerySnapshot,
} from '../lib/optimistic';
import { inventoryKeys, REFERENCE_STALE_TIME } from '../lib/query-keys';
import {
  createCategory,
  createCustomer,
  createInboundShipment,
  createOrder,
  createProduct,
  deleteCategory,
  deleteCustomer,
  deleteCustomers,
  deleteInboundShipment,
  deleteOrder,
  deleteOutboundShipment,
  deleteProduct,
  duplicateCustomers,
  fetchBrands,
  fetchCarriers,
  fetchCategories,
  fetchCustomerById,
  fetchCustomers,
  fetchInboundShipments,
  fetchOptions,
  fetchOrderById,
  fetchOrderItems,
  fetchOrders,
  fetchOrdersByCustomer,
  fetchOrderTracking,
  fetchOutboundShipments,
  fetchProductById,
  fetchProducts,
  fetchProductsByCategory,
  fetchStockProducts,
  fetchVariants,
  mapAllStock,
  mapCurrentStock,
  mapStockPlanner,
  replaceOptions,
  replaceVariants,
  statusVariant,
  updateCategory,
  updateCustomer,
  updateCustomersStatus,
  updateOrder,
  updateOrderStatus,
  updateProduct,
  updateStockLevel,
  type CustomerInput,
  type InventoryProduct,
  type InventoryStockLevel,
  type OrderInput,
  type OrderItemInput,
} from '../services/inventory';
import { fetchWarehouseStock } from '../services/warehouses';
import type {
  CategoryListRow,
  CustomerListRow,
  InboundStockRow,
  OrderDetailRow,
  OrderListRow,
  OutboundStockRow,
  ProductListRow,
  ProductOptionCard,
  ProductVariantRow,
} from '../types';

const stockQuery = {
  queryKey: inventoryKeys.stock(),
  queryFn: fetchStockProducts,
  enabled: isSupabaseConfigured,
} as const;

function useCachedMutation<TData, TVariables>(options: {
  mutationFn: (variables: TVariables) => Promise<TData>;
  keys: QueryKey[] | ((variables: TVariables) => QueryKey[]);
  apply?: (variables: TVariables, queryClient: QueryClient) => unknown;
  onSuccess?: (data: TData, variables: TVariables, extras: unknown) => void;
}) {
  const queryClient = useQueryClient();
  const resolveKeys = (variables: TVariables) =>
    typeof options.keys === 'function' ? options.keys(variables) : options.keys;
  return useMutation({
    mutationFn: options.mutationFn,
    onMutate: async (variables) => {
      const previous = await snapshotQueries(queryClient, ...resolveKeys(variables));
      const extras = options.apply?.(variables, queryClient) ?? null;
      return { previous, extras };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) restoreQueries(queryClient, context.previous as QuerySnapshot);
      toastMutationError(error);
    },
    onSuccess: (data, variables, context) => {
      options.onSuccess?.(data, variables, context?.extras);
    },
    onSettled: (_data, _error, variables) => {
      void invalidateKeys(queryClient, ...resolveKeys(variables));
    },
  });
}

function productListPatch(
  input: Parameters<typeof updateProduct>[1],
  existing: ProductListRow,
  categoryName?: string,
): ProductListRow {
  const name = input.name ?? existing.productInfo.title;
  const sku = input.sku ?? existing.productInfo.label;
  const image = input.image ?? existing.image ?? existing.productInfo.image;
  const description = input.description ?? existing.description ?? existing.productInfo.tooltip;
  const status = input.status ?? existing.status.label;
  return {
    ...existing,
    productInfo: {
      image,
      title: name,
      label: sku,
      tooltip: description || name,
    },
    price: input.price !== undefined ? formatMoney(input.price) : existing.price,
    status:
      input.status !== undefined
        ? { label: status, variant: statusVariant(status) }
        : existing.status,
    featured: input.featured ?? existing.featured,
    tags: input.tags ?? existing.tags,
    barcode: input.barcode ?? existing.barcode,
    description,
    categoryId: input.categoryId !== undefined ? input.categoryId : existing.categoryId,
    brandId: input.brandId !== undefined ? input.brandId : existing.brandId,
    image,
    category: categoryName ?? existing.category,
    updated: 'Just now',
  };
}

function categoryNameFromCache(queryClient: QueryClient, categoryId?: string | null) {
  if (categoryId === undefined) return undefined;
  if (!categoryId) return '';
  const categories = queryClient.getQueryData<CategoryListRow[]>(inventoryKeys.categories());
  return categories?.find((category) => category.id === categoryId)?.productInfo.title;
}

function optimisticProductRow(id: string, input: Parameters<typeof createProduct>[0]): ProductListRow {
  const image = input.image ?? '11.png';
  const status = input.status ?? 'Live';
  return {
    id,
    productInfo: {
      image,
      title: input.name,
      label: input.sku,
      tooltip: input.description ?? input.name,
    },
    category: '',
    price: formatMoney(input.price ?? 0),
    status: { label: status, variant: statusVariant(status) },
    created: 'Just now',
    updated: 'Just now',
    barcode: input.barcode ?? '',
    description: input.description ?? '',
    featured: Boolean(input.featured),
    tags: input.tags ?? [],
    categoryId: input.categoryId,
    brandId: input.brandId,
    image,
  };
}

function optimisticCategoryRow(id: string, input: Parameters<typeof createCategory>[0]): CategoryListRow {
  const status = input.status ?? 'Active';
  return {
    id,
    productInfo: {
      image: input.icon ?? 'running-shoes.svg',
      title: input.name,
      label: '',
    },
    productsQty: '0',
    totalEarnings: formatMoney(0),
    status: { label: status, variant: statusVariant(status) },
    featured: Boolean(input.featured),
    description: input.description ?? null,
    created: 'Just now',
    updated: 'Just now',
  };
}

function optimisticCustomerRow(id: string, input: CustomerInput): CustomerListRow {
  const status = input.status ?? 'Active';
  return withCustomerProfile({
    id,
    user: 'NEW',
    customerInfo: {
      image: input.image ?? '300-13.png',
      title: input.name.trim(),
      label: input.email?.trim() ?? '',
      statusColor: input.statusColor ?? 'offline',
      verified: Boolean(input.verified),
    },
    location: {
      name: input.locationName ?? '',
      flag: input.locationFlag ?? 'estonia.svg',
    },
    total: formatMoney(0),
    price: formatMoney(0),
    status: { label: status, variant: statusVariant(status) },
    created: '0',
    updated: 'Just now',
    phone: input.phone,
    company: input.company,
    timezone: input.timezone,
    billingAddress: input.billingAddress,
    vatId: input.vatId,
    paymentMethods: input.paymentMethods,
    reviews: input.reviews,
  });
}

function orderTotal(items: OrderItemInput[] = []) {
  const subtotal = items.reduce((sum, item) => sum + item.price * (item.quantity ?? 1), 0);
  const shippingCost = items.length ? 10 : 0;
  const tax = items.length ? 20 : 0;
  return subtotal + shippingCost + tax;
}

function optimisticOrderRow(id: string, input: OrderInput): OrderListRow {
  const items = input.items ?? [];
  const deliveryStatus = input.deliveryStatus ?? 'Pending';
  const paymentStatus = input.paymentStatus ?? 'Unpaid';
  return {
    id,
    order: input.orderNumber?.trim() || 'New order',
    date: input.date,
    customer: input.customerName,
    customerId: input.customerId,
    total: formatMoney(orderTotal(items)),
    items: items.length,
    category: input.category ?? '',
    deliveryStatus: { label: deliveryStatus, variant: statusVariant(deliveryStatus) },
    paymentStatus: { label: paymentStatus, variant: statusVariant(paymentStatus) },
    carrier: {
      name: input.carrierName ?? '',
      logo: input.carrierLogo ?? 'ups.svg',
    },
  };
}

function customerListPatch(input: Partial<CustomerInput>, existing: CustomerListRow): CustomerListRow {
  const status = input.status ?? existing.status.label;
  return {
    ...existing,
    customerInfo: {
      ...existing.customerInfo,
      title: input.name ?? existing.customerInfo.title,
      label: input.email ?? existing.customerInfo.label,
      image: input.image ?? existing.customerInfo.image,
      statusColor: input.statusColor ?? existing.customerInfo.statusColor,
      verified: input.verified ?? existing.customerInfo.verified,
    },
    location: {
      name: input.locationName ?? existing.location.name,
      flag: input.locationFlag ?? existing.location.flag,
    },
    status:
      input.status !== undefined
        ? { label: status, variant: statusVariant(status) }
        : existing.status,
    phone: input.phone ?? existing.phone,
    company: input.company ?? existing.company,
    timezone: input.timezone ?? existing.timezone,
    billingAddress: input.billingAddress ?? existing.billingAddress,
    vatId: input.vatId ?? existing.vatId,
    paymentMethods: input.paymentMethods ?? existing.paymentMethods,
    reviews: input.reviews ?? existing.reviews,
    updated: 'Just now',
  };
}

function orderListPatch(input: Partial<OrderInput>, existing: OrderListRow): OrderListRow {
  const items = input.items;
  const deliveryStatus = input.deliveryStatus ?? existing.deliveryStatus.label;
  const paymentStatus = input.paymentStatus ?? existing.paymentStatus.label;
  return {
    ...existing,
    order: input.orderNumber ?? existing.order,
    date: input.date ?? existing.date,
    customer: input.customerName ?? existing.customer,
    customerId: input.customerId !== undefined ? input.customerId : existing.customerId,
    category: input.category ?? existing.category,
    items: items ? items.length : existing.items,
    total: items ? formatMoney(orderTotal(items)) : existing.total,
    deliveryStatus:
      input.deliveryStatus !== undefined
        ? { label: deliveryStatus, variant: statusVariant(deliveryStatus) }
        : existing.deliveryStatus,
    paymentStatus:
      input.paymentStatus !== undefined
        ? { label: paymentStatus, variant: statusVariant(paymentStatus) }
        : existing.paymentStatus,
    carrier: {
      name: input.carrierName ?? existing.carrier.name,
      logo: input.carrierLogo ?? existing.carrier.logo,
    },
    shippingPriority: input.shippingPriority ?? existing.shippingPriority,
    deliveryMethod: input.deliveryMethod ?? existing.deliveryMethod,
    originAddress: input.originAddress ?? existing.originAddress,
    destinationAddress: input.destinationAddress ?? existing.destinationAddress,
    shippingLabel: input.shippingLabel ?? existing.shippingLabel,
    shippingLine1: input.shippingLine1 ?? existing.shippingLine1,
    shippingLine2: input.shippingLine2 ?? existing.shippingLine2,
  };
}

export function useProducts() {
  return useQuery({
    queryKey: inventoryKeys.products(),
    queryFn: fetchProducts,
    enabled: isSupabaseConfigured,
  });
}

export function useProduct(id?: string) {
  return useQuery({
    queryKey: inventoryKeys.product(id ?? ''),
    queryFn: () => fetchProductById(id!),
    enabled: isSupabaseConfigured && Boolean(id),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: inventoryKeys.categories(),
    queryFn: fetchCategories,
    enabled: isSupabaseConfigured,
  });
}

export function useCategoryProducts(categoryId?: string) {
  return useQuery({
    queryKey: inventoryKeys.categoryProducts(categoryId),
    queryFn: () => fetchProductsByCategory(categoryId!),
    enabled: isSupabaseConfigured && Boolean(categoryId),
  });
}

export function useBrands() {
  return useQuery({
    queryKey: inventoryKeys.brands(),
    queryFn: fetchBrands,
    enabled: isSupabaseConfigured,
    staleTime: REFERENCE_STALE_TIME,
  });
}

export function useAllStock(warehouseId?: string | null) {
  const stock = useQuery({
    ...stockQuery,
  });
  const warehouseStock = useQuery({
    queryKey: inventoryKeys.warehouseStock(warehouseId ?? ''),
    queryFn: () => fetchWarehouseStock(warehouseId!),
    enabled: isSupabaseConfigured && Boolean(warehouseId),
  });
  const qtyMap = new Map((warehouseStock.data ?? []).map((row) => [row.productId, row]));
  return {
    ...stock,
    data: stock.data
      ? stock.data.map((product) => {
          if (!warehouseId) return mapAllStock(product);
          const overlay = qtyMap.get(product.id);
          return mapAllStock({
            ...product,
            stock_level: product.stock_level
              ? {
                  ...product.stock_level,
                  qty: overlay?.qty ?? 0,
                  reserved: overlay?.reserved ?? 0,
                }
              : product.stock_level,
          });
        })
      : stock.data,
  };
}

export function useCurrentStock(warehouseId?: string | null) {
  const stock = useQuery({
    ...stockQuery,
  });
  const warehouseStock = useQuery({
    queryKey: inventoryKeys.warehouseStock(warehouseId ?? ''),
    queryFn: () => fetchWarehouseStock(warehouseId!),
    enabled: isSupabaseConfigured && Boolean(warehouseId),
  });
  const qtyMap = new Map((warehouseStock.data ?? []).map((row) => [row.productId, row]));
  return {
    ...stock,
    data: stock.data
      ? stock.data.map((product) => {
          if (!warehouseId) return mapCurrentStock(product);
          const overlay = qtyMap.get(product.id);
          return mapCurrentStock({
            ...product,
            stock_level: product.stock_level
              ? {
                  ...product.stock_level,
                  qty: overlay?.qty ?? 0,
                  reserved: overlay?.reserved ?? 0,
                }
              : product.stock_level,
          });
        })
      : stock.data,
  };
}

export function useStockPlanner() {
  return useQuery({
    ...stockQuery,
    select: (rows) => rows.map(mapStockPlanner),
  });
}

export function useInboundStock() {
  return useQuery({
    queryKey: inventoryKeys.inbound(),
    queryFn: fetchInboundShipments,
    enabled: isSupabaseConfigured,
  });
}

export function useOutboundStock() {
  return useQuery({
    queryKey: inventoryKeys.outbound(),
    queryFn: fetchOutboundShipments,
    enabled: isSupabaseConfigured,
  });
}

export function useCustomers() {
  return useQuery({
    queryKey: inventoryKeys.customers(),
    queryFn: fetchCustomers,
    enabled: isSupabaseConfigured,
  });
}

export function useCustomer(id?: string) {
  return useQuery({
    queryKey: inventoryKeys.customer(id ?? ''),
    queryFn: () => fetchCustomerById(id!),
    enabled: isSupabaseConfigured && Boolean(id),
  });
}

export function useCustomerOrders(customerId?: string) {
  return useQuery({
    queryKey: inventoryKeys.customerOrders(customerId),
    queryFn: () => fetchOrdersByCustomer(customerId!),
    enabled: isSupabaseConfigured && Boolean(customerId),
  });
}

export function useOrders() {
  return useQuery({
    queryKey: inventoryKeys.orders(),
    queryFn: fetchOrders,
    enabled: isSupabaseConfigured,
  });
}

export function useOrder(id?: string) {
  return useQuery({
    queryKey: inventoryKeys.order(id ?? ''),
    queryFn: () => fetchOrderById(id!),
    enabled: isSupabaseConfigured && Boolean(id),
  });
}

export function useOrderItems(orderId?: string) {
  return useQuery({
    queryKey: inventoryKeys.orderItems(orderId),
    queryFn: () => fetchOrderItems(orderId),
    enabled: isSupabaseConfigured && Boolean(orderId),
  });
}

export function useOrderTracking(orderId?: string) {
  return useQuery({
    queryKey: inventoryKeys.orderTracking(orderId),
    queryFn: () => fetchOrderTracking(orderId!),
    enabled: isSupabaseConfigured && Boolean(orderId),
  });
}

export function useCarriers() {
  return useQuery({
    queryKey: inventoryKeys.carriers(),
    queryFn: fetchCarriers,
    enabled: isSupabaseConfigured,
    staleTime: REFERENCE_STALE_TIME,
  });
}

export function useProductVariants(productId?: string) {
  return useQuery({
    queryKey: inventoryKeys.variants(productId),
    queryFn: () => fetchVariants(productId!),
    enabled: isSupabaseConfigured && Boolean(productId),
  });
}

export function useProductOptions(productId?: string) {
  return useQuery({
    queryKey: inventoryKeys.options(productId),
    queryFn: () => fetchOptions(productId!),
    enabled: isSupabaseConfigured && Boolean(productId),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useCachedMutation({
    mutationFn: createProduct,
    keys: [inventoryKeys.products(), inventoryKeys.stock(), inventoryKeys.categories(), inventoryKeys.categoryProducts()],
    apply: (input) => {
      const tempId = crypto.randomUUID();
      prependToList(queryClient, inventoryKeys.products(), optimisticProductRow(tempId, input));
      return { tempId };
    },
    onSuccess: (id, _input, extras) => {
      const tempId = (extras as { tempId?: string } | null)?.tempId;
      if (tempId) replaceListItemId(queryClient, inventoryKeys.products(), tempId, id);
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useCachedMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateProduct>[1] }) =>
      updateProduct(id, input),
    keys: ({ id }) => [
      inventoryKeys.products(),
      inventoryKeys.product(id),
      inventoryKeys.stock(),
      inventoryKeys.categoryProducts(),
    ],
    apply: ({ id, input }) => {
      const categoryName = categoryNameFromCache(queryClient, input.categoryId);
      patchListById<ProductListRow>(queryClient, inventoryKeys.products(), id, (item) =>
        productListPatch(input, item, categoryName),
      );
      patchQueryData<ProductListRow>(queryClient, inventoryKeys.product(id), (item) =>
        productListPatch(input, item, categoryName),
      );
      patchListById<InventoryProduct>(queryClient, inventoryKeys.stock(), id, (product) => ({
        ...product,
        name: input.name ?? product.name,
        sku: input.sku ?? product.sku,
        barcode: input.barcode !== undefined ? input.barcode || null : product.barcode,
        description: input.description !== undefined ? input.description || null : product.description,
        category_id: input.categoryId !== undefined ? input.categoryId : product.category_id,
        brand_id: input.brandId !== undefined ? input.brandId : product.brand_id,
        price: input.price ?? product.price,
        status: input.status ?? product.status,
        featured: input.featured ?? product.featured,
        tags: input.tags ?? product.tags,
        image: input.image ?? product.image,
      }));
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useCachedMutation({
    mutationFn: deleteProduct,
    keys: [
      inventoryKeys.products(),
      inventoryKeys.stock(),
      inventoryKeys.categories(),
      inventoryKeys.categoryProducts(),
    ],
    apply: (id) => {
      removeFromList(queryClient, inventoryKeys.products(), id);
      removeFromList(queryClient, inventoryKeys.stock(), id);
      queryClient.removeQueries({ queryKey: inventoryKeys.product(id) });
      queryClient.removeQueries({ queryKey: inventoryKeys.variants(id) });
      queryClient.removeQueries({ queryKey: inventoryKeys.options(id) });
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useCachedMutation({
    mutationFn: createCategory,
    keys: [inventoryKeys.categories()],
    apply: (input) => {
      const tempId = crypto.randomUUID();
      prependToList(queryClient, inventoryKeys.categories(), optimisticCategoryRow(tempId, input));
      return { tempId };
    },
    onSuccess: (id, _input, extras) => {
      const tempId = (extras as { tempId?: string } | null)?.tempId;
      if (tempId) replaceListItemId(queryClient, inventoryKeys.categories(), tempId, id);
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useCachedMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateCategory>[1] }) =>
      updateCategory(id, input),
    keys: [inventoryKeys.categories(), inventoryKeys.products()],
    apply: ({ id, input }) => {
      patchListById<CategoryListRow>(queryClient, inventoryKeys.categories(), id, (item) => {
        const status = input.status ?? item.status.label;
        return {
          ...item,
          featured: input.featured ?? item.featured,
          description: input.description !== undefined ? input.description : item.description,
          productInfo: {
            image: input.icon ?? item.productInfo.image,
            title: input.name ?? item.productInfo.title,
            label: item.productInfo.label,
          },
          status:
            input.status !== undefined
              ? { label: status, variant: statusVariant(status) }
              : item.status,
          updated: 'Just now',
        };
      });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useCachedMutation({
    mutationFn: deleteCategory,
    keys: [inventoryKeys.categories(), inventoryKeys.products(), inventoryKeys.categoryProducts()],
    apply: (id) => {
      removeFromList(queryClient, inventoryKeys.categories(), id);
      queryClient.removeQueries({ queryKey: inventoryKeys.categoryProducts(id) });
    },
  });
}

export function useUpdateStockLevel() {
  const queryClient = useQueryClient();
  return useCachedMutation({
    mutationFn: ({
      productId,
      input,
    }: {
      productId: string;
      input: Partial<InventoryStockLevel> & { warehouseId?: string };
    }) => updateStockLevel(productId, input),
    keys: [inventoryKeys.stock(), inventoryKeys.warehouseStock()],
    apply: ({ productId, input }) => {
      patchListById<InventoryProduct>(queryClient, inventoryKeys.stock(), productId, (product) => ({
        ...product,
        stock_level: product.stock_level ? { ...product.stock_level, ...input } : product.stock_level,
      }));
    },
  });
}

export function useCreateInboundShipment() {
  return useCachedMutation({
    mutationFn: createInboundShipment,
    keys: [inventoryKeys.inbound(), inventoryKeys.stock(), inventoryKeys.warehouseStock()],
  });
}

export function useDeleteInboundShipment() {
  const queryClient = useQueryClient();
  return useCachedMutation({
    mutationFn: deleteInboundShipment,
    keys: [inventoryKeys.inbound(), inventoryKeys.stock()],
    apply: (id) => {
      removeFromList<InboundStockRow>(queryClient, inventoryKeys.inbound(), id);
    },
  });
}

export function useDeleteOutboundShipment() {
  const queryClient = useQueryClient();
  return useCachedMutation({
    mutationFn: deleteOutboundShipment,
    keys: [inventoryKeys.outbound(), inventoryKeys.stock()],
    apply: (id) => {
      removeFromList<OutboundStockRow>(queryClient, inventoryKeys.outbound(), id);
    },
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useCachedMutation({
    mutationFn: createCustomer,
    keys: [inventoryKeys.customers()],
    apply: (input) => {
      const tempId = crypto.randomUUID();
      prependToList(queryClient, inventoryKeys.customers(), optimisticCustomerRow(tempId, input));
      return { tempId };
    },
    onSuccess: (id, _input, extras) => {
      const tempId = (extras as { tempId?: string } | null)?.tempId;
      if (tempId) replaceListItemId(queryClient, inventoryKeys.customers(), tempId, id);
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useCachedMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CustomerInput> }) =>
      updateCustomer(id, input),
    keys: ({ id }) => [inventoryKeys.customers(), inventoryKeys.customer(id)],
    apply: ({ id, input }) => {
      patchListById<CustomerListRow>(queryClient, inventoryKeys.customers(), id, (item) =>
        customerListPatch(input, item),
      );
      patchQueryData<CustomerListRow>(queryClient, inventoryKeys.customer(id), (item) =>
        customerListPatch(input, item),
      );
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useCachedMutation({
    mutationFn: deleteCustomer,
    keys: [inventoryKeys.customers(), inventoryKeys.customerOrders()],
    apply: (id) => {
      removeFromList(queryClient, inventoryKeys.customers(), id);
      queryClient.removeQueries({ queryKey: inventoryKeys.customer(id) });
      queryClient.removeQueries({ queryKey: inventoryKeys.customerOrders(id) });
    },
  });
}

export function useUpdateCustomersStatus() {
  const queryClient = useQueryClient();
  return useCachedMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: string }) =>
      updateCustomersStatus(ids, status),
    keys: [inventoryKeys.customers()],
    apply: ({ ids, status }) => {
      patchListByIds<CustomerListRow>(queryClient, inventoryKeys.customers(), ids, (item) => ({
        ...item,
        status: { label: status, variant: statusVariant(status) },
      }));
    },
  });
}

export function useDeleteCustomers() {
  const queryClient = useQueryClient();
  return useCachedMutation({
    mutationFn: deleteCustomers,
    keys: [inventoryKeys.customers()],
    apply: (ids) => {
      removeFromList(queryClient, inventoryKeys.customers(), ids);
    },
  });
}

export function useDuplicateCustomers() {
  const queryClient = useQueryClient();
  return useCachedMutation({
    mutationFn: (customers: CustomerListRow[]) => duplicateCustomers(customers),
    keys: [inventoryKeys.customers()],
    apply: (customers) => {
      const copies = customers.map((customer) => ({
        ...customer,
        id: crypto.randomUUID(),
        customerInfo: {
          ...customer.customerInfo,
          title: `${customer.customerInfo.title} (Copy)`,
        },
        created: '0',
        total: formatMoney(0),
      }));
      copies.forEach((copy) => prependToList(queryClient, inventoryKeys.customers(), copy));
    },
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useCachedMutation({
    mutationFn: createOrder,
    keys: [inventoryKeys.orders(), inventoryKeys.customerOrders()],
    apply: (input) => {
      const tempId = crypto.randomUUID();
      prependToList(queryClient, inventoryKeys.orders(), optimisticOrderRow(tempId, input));
      return { tempId };
    },
    onSuccess: (id, _input, extras) => {
      const tempId = (extras as { tempId?: string } | null)?.tempId;
      if (tempId) replaceListItemId(queryClient, inventoryKeys.orders(), tempId, id);
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  return useCachedMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<OrderInput> }) => updateOrder(id, input),
    keys: ({ id }) => [
      inventoryKeys.orders(),
      inventoryKeys.order(id),
      inventoryKeys.orderItems(),
      inventoryKeys.customerOrders(),
    ],
    apply: ({ id, input }) => {
      patchListById<OrderListRow>(queryClient, inventoryKeys.orders(), id, (item) =>
        orderListPatch(input, item),
      );
      patchQueryData<OrderDetailRow>(queryClient, inventoryKeys.order(id), (item) => ({
        ...item,
        ...orderListPatch(input, item),
      }));
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useCachedMutation({
    mutationFn: ({
      id,
      paymentStatus,
      deliveryStatus,
    }: {
      id: string;
      paymentStatus: string;
      deliveryStatus?: string;
    }) => updateOrderStatus(id, paymentStatus, deliveryStatus),
    keys: ({ id }) => [inventoryKeys.orders(), inventoryKeys.order(id)],
    apply: ({ id, paymentStatus, deliveryStatus }) => {
      const patch = (item: OrderListRow): OrderListRow => ({
        ...item,
        paymentStatus: { label: paymentStatus, variant: statusVariant(paymentStatus) },
        deliveryStatus: deliveryStatus
          ? { label: deliveryStatus, variant: statusVariant(deliveryStatus) }
          : item.deliveryStatus,
      });
      patchListById<OrderListRow>(queryClient, inventoryKeys.orders(), id, patch);
      patchQueryData<OrderDetailRow>(queryClient, inventoryKeys.order(id), (item) => ({
        ...item,
        ...patch(item),
      }));
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  return useCachedMutation({
    mutationFn: deleteOrder,
    keys: [
      inventoryKeys.orders(),
      inventoryKeys.orderItems(),
      inventoryKeys.orderTracking(),
      inventoryKeys.customerOrders(),
    ],
    apply: (id) => {
      removeFromList(queryClient, inventoryKeys.orders(), id);
      queryClient.removeQueries({ queryKey: inventoryKeys.order(id) });
      queryClient.removeQueries({ queryKey: inventoryKeys.orderItems(id) });
      queryClient.removeQueries({ queryKey: inventoryKeys.orderTracking(id) });
    },
  });
}

export function useReplaceVariants() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, variants }: { productId: string; variants: ProductVariantRow[] }) =>
      replaceVariants(productId, variants),
    onError: (error) => toastMutationError(error),
    onSettled: (_data, _error, variables) => {
      void invalidateKeys(
        queryClient,
        inventoryKeys.variants(variables.productId),
        inventoryKeys.product(variables.productId),
        inventoryKeys.products(),
      );
    },
  });
}

export function useReplaceOptions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, options }: { productId: string; options: ProductOptionCard[] }) =>
      replaceOptions(productId, options),
    onError: (error) => toastMutationError(error),
    onSettled: (_data, _error, variables) => {
      void invalidateKeys(
        queryClient,
        inventoryKeys.options(variables.productId),
        inventoryKeys.product(variables.productId),
      );
    },
  });
}

import { isSupabaseConfigured } from '@/lib/supabase';
import { useMemo } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { withCustomerProfile } from '../data/customer-profile';
import { generateCategoryCode } from '../lib/category-validation';
import { formatMoney, parseMoney } from '../lib/format';
import { computeOrderPricing } from '../lib/order-pricing';
import { mapOrderError } from '../lib/order-errors';
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
  createInboundShipmentsBatch,
  applyStockEntries,
  createOrder,
  createOutboundShipment,
  createProduct,
  cancelOrder,
  deleteCategory,
  deleteCategories,
  archiveCategories,
  deleteCustomers,
  deleteInboundShipment,
  deleteOrder,
  deleteOutboundShipment,
  softDeleteProduct,
  restoreProduct,
  hardDeleteProduct,
  fetchProductDeleteImpact,
  softDeleteCustomer,
  restoreCustomer,
  hardDeleteCustomer,
  fetchCustomerDeleteImpact,
  fetchDeletedCustomers,
  duplicateCustomers,
  fetchBrands,
  fetchStockSummary,
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
  fetchDeletedProducts,
  fetchProductsByCategory,
  fetchStockProducts,
  fetchStockMovements,
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
  type StockEntryLineInput,
} from '../services/inventory';
import { aggregateStockHistory } from '../lib/stock-history';
import type { StockEntryType } from '../lib/stock-entry';
import { overlayWarehouseStockLevel } from '../lib/stock-delta';
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
  StockHistoryRow,
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

function optimisticCategoryRow(
  id: string,
  input: Parameters<typeof createCategory>[0],
  code: string,
): CategoryListRow {
  const status = input.status ?? 'Active';
  return {
    id,
    productInfo: {
      image: input.icon ?? 'running-shoes.svg',
      title: input.name,
      label: code,
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
    accountBalance: 0,
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
  return computeOrderPricing(items).total;
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

export function useDeletedProducts() {
  return useQuery({
    queryKey: inventoryKeys.deletedProducts(),
    queryFn: fetchDeletedProducts,
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

export function useActiveCategories() {
  const query = useCategories();
  return {
    ...query,
    data: (query.data ?? []).filter((row) => row.status.label.toLowerCase() === 'active'),
  };
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

function useStockWithWarehouseOverlay<T>(
  warehouseId: string | null | undefined,
  mapRow: (product: InventoryProduct) => T,
) {
  const stock = useQuery({
    ...stockQuery,
  });
  const warehouseStock = useQuery({
    queryKey: inventoryKeys.warehouseStock(warehouseId ?? ''),
    queryFn: () => fetchWarehouseStock(warehouseId!),
    enabled: isSupabaseConfigured && Boolean(warehouseId),
  });
  const needsOverlay = isSupabaseConfigured && Boolean(warehouseId);
  const overlayReady = !needsOverlay || warehouseStock.isSuccess;
  const data = useMemo(() => {
    if (!stock.data || !overlayReady) return undefined;
    const qtyMap = new Map((warehouseStock.data ?? []).map((row) => [row.productId, row]));
    return stock.data.map((product) => {
      if (!warehouseId) return mapRow(product);
      const overlay = qtyMap.get(product.id);
      return mapRow({
        ...product,
        stock_level: overlayWarehouseStockLevel(
          product.stock_level,
          overlay?.qty ?? 0,
          overlay?.reserved ?? 0,
        ),
      });
    });
  }, [stock.data, overlayReady, warehouseId, warehouseStock.data, mapRow]);

  return {
    ...stock,
    isPending: stock.isPending || (needsOverlay && warehouseStock.isPending),
    isLoading: stock.isLoading || (needsOverlay && warehouseStock.isLoading),
    isFetching: stock.isFetching || (needsOverlay && warehouseStock.isFetching),
    isError: stock.isError || (needsOverlay && warehouseStock.isError),
    isSuccess: stock.isSuccess && overlayReady,
    error: stock.error ?? (needsOverlay && warehouseStock.isError ? warehouseStock.error : null),
    data,
  };
}

export function useAllStock(warehouseId?: string | null) {
  return useStockWithWarehouseOverlay(warehouseId, mapAllStock);
}

export function useCurrentStock(warehouseId?: string | null) {
  return useStockWithWarehouseOverlay(warehouseId, mapCurrentStock);
}

export function useStockPlanner(warehouseId?: string | null) {
  return useStockWithWarehouseOverlay(warehouseId, mapStockPlanner);
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

function productOnHandQty(product: InventoryProduct): number {
  const level = product.stock_level as InventoryStockLevel | InventoryStockLevel[] | null | undefined;
  const row = Array.isArray(level) ? level[0] : level;
  return Number(row?.qty ?? 0);
}

export function useStockHistory(
  warehouseId: string | null | undefined,
  rangeStart: Date,
  rangeEnd: Date,
) {
  const fromIso = rangeStart.toISOString();
  const products = useQuery({
    ...stockQuery,
  });
  const warehouseStock = useQuery({
    queryKey: inventoryKeys.warehouseStock(warehouseId ?? ''),
    queryFn: () => fetchWarehouseStock(warehouseId!),
    enabled: isSupabaseConfigured && Boolean(warehouseId),
  });
  const movements = useQuery({
    queryKey: inventoryKeys.stockHistory(warehouseId ?? null, fromIso),
    queryFn: () =>
      fetchStockMovements({
        from: rangeStart,
        warehouseId: warehouseId ?? null,
      }),
    enabled: isSupabaseConfigured,
  });

  const needsOverlay = isSupabaseConfigured && Boolean(warehouseId);
  const overlayReady = !needsOverlay || warehouseStock.isSuccess;

  const data = useMemo((): StockHistoryRow[] | undefined => {
    if (!isSupabaseConfigured) return [];
    if (!products.data || !movements.data || !overlayReady) return undefined;
    const qtyMap = new Map((warehouseStock.data ?? []).map((row) => [row.productId, row.qty]));
    return aggregateStockHistory({
      products: products.data.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        unitPrice: parseMoney(product.price),
        currentQty: warehouseId ? (qtyMap.get(product.id) ?? 0) : productOnHandQty(product),
      })),
      movements: movements.data.map((movement) => ({
        productId: movement.product_id,
        delta: movement.delta,
        reason: movement.reason,
        createdAt: movement.created_at,
      })),
      rangeStart,
      rangeEnd,
    });
  }, [
    products.data,
    movements.data,
    overlayReady,
    warehouseId,
    warehouseStock.data,
    rangeStart,
    rangeEnd,
  ]);

  return {
    data,
    isLoading:
      products.isLoading ||
      movements.isLoading ||
      (needsOverlay && warehouseStock.isLoading) ||
      data === undefined,
    isError: products.isError || movements.isError || (needsOverlay && warehouseStock.isError),
    error: products.error ?? movements.error ?? warehouseStock.error,
  };
}

export function useCustomers() {
  return useQuery({
    queryKey: inventoryKeys.customers(),
    queryFn: fetchCustomers,
    enabled: isSupabaseConfigured,
  });
}

export function useDeletedCustomers() {
  return useQuery({
    queryKey: inventoryKeys.deletedCustomers(),
    queryFn: fetchDeletedCustomers,
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
    keys: [
      inventoryKeys.products(),
      inventoryKeys.stock(),
      inventoryKeys.categories(),
      inventoryKeys.categoryProducts(),
      inventoryKeys.warehouses(),
      inventoryKeys.warehouseStock(),
    ],
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
    mutationFn: softDeleteProduct,
    keys: [
      inventoryKeys.products(),
      inventoryKeys.deletedProducts(),
      inventoryKeys.stock(),
      inventoryKeys.categories(),
      inventoryKeys.categoryProducts(),
      inventoryKeys.posCatalog(),
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

export function useRestoreProduct() {
  const queryClient = useQueryClient();
  return useCachedMutation({
    mutationFn: restoreProduct,
    keys: [
      inventoryKeys.products(),
      inventoryKeys.deletedProducts(),
      inventoryKeys.stock(),
      inventoryKeys.categories(),
      inventoryKeys.categoryProducts(),
    ],
    apply: (id) => {
      removeFromList(queryClient, inventoryKeys.deletedProducts(), id);
    },
  });
}

export function useHardDeleteProduct() {
  const queryClient = useQueryClient();
  return useCachedMutation({
    mutationFn: hardDeleteProduct,
    keys: [
      inventoryKeys.products(),
      inventoryKeys.deletedProducts(),
      inventoryKeys.stock(),
      inventoryKeys.categories(),
      inventoryKeys.categoryProducts(),
    ],
    apply: (id) => {
      removeFromList(queryClient, inventoryKeys.deletedProducts(), id);
      removeFromList(queryClient, inventoryKeys.products(), id);
      removeFromList(queryClient, inventoryKeys.stock(), id);
      queryClient.removeQueries({ queryKey: inventoryKeys.product(id) });
      queryClient.removeQueries({ queryKey: inventoryKeys.productDeleteImpact(id) });
    },
  });
}

export function useProductDeleteImpact(id?: string, enabled = false) {
  return useQuery({
    queryKey: inventoryKeys.productDeleteImpact(id ?? ''),
    queryFn: () => fetchProductDeleteImpact(id!),
    enabled: isSupabaseConfigured && Boolean(id) && enabled,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useCachedMutation({
    mutationFn: createCategory,
    keys: [inventoryKeys.categories()],
    apply: (input) => {
      const tempId = crypto.randomUUID();
      const code = generateCategoryCode(input.name, tempId);
      prependToList(
        queryClient,
        inventoryKeys.categories(),
        optimisticCategoryRow(tempId, input, code),
      );
      return { tempId };
    },
    onSuccess: (result, _input, extras) => {
      const tempId = (extras as { tempId?: string } | null)?.tempId;
      if (tempId) {
        replaceListItemId(queryClient, inventoryKeys.categories(), tempId, result.id);
        patchListById<CategoryListRow>(queryClient, inventoryKeys.categories(), result.id, (item) => ({
          ...item,
          productInfo: {
            ...item.productInfo,
            label: result.code,
          },
        }));
      }
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
  return useCachedMutation({
    mutationFn: ({
      id,
      reassignToCategoryId,
    }: {
      id: string;
      reassignToCategoryId?: string | null;
    }) => deleteCategory(id, { reassignToCategoryId }),
    keys: [inventoryKeys.categories(), inventoryKeys.products(), inventoryKeys.categoryProducts()],
    // Intentionally no optimistic remove — delete has preflight product checks.
  });
}

export function useArchiveCategories() {
  return useCachedMutation({
    mutationFn: (ids: string[]) => archiveCategories(ids),
    keys: [inventoryKeys.categories()],
  });
}

export function useDeleteCategories() {
  return useCachedMutation({
    mutationFn: ({
      ids,
      reassignToCategoryId,
    }: {
      ids: string[];
      reassignToCategoryId?: string | null;
    }) => deleteCategories(ids, { reassignToCategoryId }),
    keys: [inventoryKeys.categories(), inventoryKeys.products(), inventoryKeys.categoryProducts()],
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

export function useCreateInboundShipmentsBatch() {
  return useCachedMutation({
    mutationFn: createInboundShipmentsBatch,
    keys: [inventoryKeys.inbound(), inventoryKeys.stock(), inventoryKeys.warehouseStock()],
  });
}

export function useApplyStockEntries() {
  return useCachedMutation({
    mutationFn: ({ type, lines }: { type: StockEntryType; lines: StockEntryLineInput[] }) =>
      applyStockEntries(type, lines),
    keys: [inventoryKeys.inbound(), inventoryKeys.stock(), inventoryKeys.warehouseStock()],
  });
}

export function useDeleteInboundShipment() {
  const queryClient = useQueryClient();
  return useCachedMutation({
    mutationFn: deleteInboundShipment,
    keys: [inventoryKeys.inbound(), inventoryKeys.stock(), inventoryKeys.warehouseStock()],
    apply: (id) => {
      removeFromList<InboundStockRow>(queryClient, inventoryKeys.inbound(), id);
    },
  });
}

export function useDeleteOutboundShipment() {
  const queryClient = useQueryClient();
  return useCachedMutation({
    mutationFn: deleteOutboundShipment,
    keys: [inventoryKeys.outbound(), inventoryKeys.stock(), inventoryKeys.warehouseStock()],
    apply: (id) => {
      removeFromList<OutboundStockRow>(queryClient, inventoryKeys.outbound(), id);
    },
  });
}

export function useCreateOutboundShipment() {
  return useCachedMutation({
    mutationFn: createOutboundShipment,
    keys: [inventoryKeys.outbound(), inventoryKeys.stock(), inventoryKeys.warehouseStock()],
  });
}

export function useStockSummary() {
  return useQuery({
    queryKey: [...inventoryKeys.stock(), 'summary'] as const,
    queryFn: fetchStockSummary,
    enabled: isSupabaseConfigured,
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
    mutationFn: softDeleteCustomer,
    keys: [
      inventoryKeys.customers(),
      inventoryKeys.deletedCustomers(),
      inventoryKeys.customerOrders(),
    ],
    apply: (id) => {
      removeFromList(queryClient, inventoryKeys.customers(), id);
      queryClient.removeQueries({ queryKey: inventoryKeys.customer(id) });
      queryClient.removeQueries({ queryKey: inventoryKeys.customerOrders(id) });
      queryClient.removeQueries({ queryKey: inventoryKeys.customerAccountTransactions(id) });
    },
  });
}

export function useRestoreCustomer() {
  const queryClient = useQueryClient();
  return useCachedMutation({
    mutationFn: restoreCustomer,
    keys: [inventoryKeys.customers(), inventoryKeys.deletedCustomers()],
    apply: (id) => {
      removeFromList(queryClient, inventoryKeys.deletedCustomers(), id);
    },
  });
}

export function useHardDeleteCustomer() {
  const queryClient = useQueryClient();
  return useCachedMutation({
    mutationFn: hardDeleteCustomer,
    keys: [inventoryKeys.customers(), inventoryKeys.deletedCustomers()],
    apply: (id) => {
      removeFromList(queryClient, inventoryKeys.deletedCustomers(), id);
      removeFromList(queryClient, inventoryKeys.customers(), id);
      queryClient.removeQueries({ queryKey: inventoryKeys.customer(id) });
      queryClient.removeQueries({ queryKey: inventoryKeys.customerDeleteImpact(id) });
      queryClient.removeQueries({ queryKey: inventoryKeys.customerOrders(id) });
      queryClient.removeQueries({ queryKey: inventoryKeys.customerAccountTransactions(id) });
    },
  });
}

export function useCustomerDeleteImpact(id?: string, enabled = false) {
  return useQuery({
    queryKey: inventoryKeys.customerDeleteImpact(id ?? ''),
    queryFn: () => fetchCustomerDeleteImpact(id!),
    enabled: isSupabaseConfigured && Boolean(id) && enabled,
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
    keys: [inventoryKeys.customers(), inventoryKeys.deletedCustomers()],
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
        accountBalance: 0,
      }));
      copies.forEach((copy) => prependToList(queryClient, inventoryKeys.customers(), copy));
    },
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useCachedMutation({
    mutationFn: async (input: OrderInput) => {
      try {
        return await createOrder(input);
      } catch (error) {
        throw mapOrderError(error);
      }
    },
    keys: [
      inventoryKeys.orders(),
      inventoryKeys.customerOrders(),
      inventoryKeys.stock(),
      inventoryKeys.warehouseStock(),
    ],
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
    mutationFn: async ({ id, input }: { id: string; input: Partial<OrderInput> }) => {
      try {
        await updateOrder(id, input);
      } catch (error) {
        throw mapOrderError(error);
      }
    },
    keys: ({ id }) => [
      inventoryKeys.orders(),
      inventoryKeys.order(id),
      inventoryKeys.orderItems(),
      inventoryKeys.customerOrders(),
      inventoryKeys.stock(),
      inventoryKeys.warehouseStock(),
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
    mutationFn: async ({
      id,
      paymentStatus,
      deliveryStatus,
    }: {
      id: string;
      paymentStatus: string;
      deliveryStatus?: string;
    }) => {
      try {
        await updateOrderStatus(id, paymentStatus, deliveryStatus);
      } catch (error) {
        throw mapOrderError(error);
      }
    },
    keys: ({ id }) => [
      inventoryKeys.orders(),
      inventoryKeys.order(id),
      inventoryKeys.orderTracking(),
      inventoryKeys.stock(),
      inventoryKeys.warehouseStock(),
    ],
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

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useCachedMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      try {
        await cancelOrder(id, reason);
      } catch (error) {
        throw mapOrderError(error);
      }
    },
    keys: [
      inventoryKeys.orders(),
      inventoryKeys.orderItems(),
      inventoryKeys.orderTracking(),
      inventoryKeys.customerOrders(),
      inventoryKeys.stock(),
      inventoryKeys.warehouseStock(),
    ],
    apply: ({ id }) => {
      patchListById<OrderListRow>(queryClient, inventoryKeys.orders(), id, (item) => ({
        ...item,
        deliveryStatus: { label: 'Canceled', variant: statusVariant('Canceled') },
        paymentStatus: { label: 'Cancelled', variant: statusVariant('Cancelled') },
      }));
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  return useCachedMutation({
    mutationFn: async (id: string) => {
      try {
        await deleteOrder(id);
      } catch (error) {
        throw mapOrderError(error);
      }
    },
    keys: [
      inventoryKeys.orders(),
      inventoryKeys.orderItems(),
      inventoryKeys.orderTracking(),
      inventoryKeys.customerOrders(),
      inventoryKeys.stock(),
      inventoryKeys.warehouseStock(),
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

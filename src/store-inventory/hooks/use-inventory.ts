import { isSupabaseConfigured } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCategory,
  createCustomer,
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
  updateOrder,
  updateOrderStatus,
  mapAllStock,
  mapCurrentStock,
  mapStockPlanner,
  replaceOptions,
  replaceVariants,
  updateCategory,
  updateCustomer,
  updateCustomersStatus,
  updateProduct,
  updateStockLevel,
} from '../services/inventory';
import type { CustomerListRow, ProductOptionCard, ProductVariantRow } from '../types';

const inventoryKey = ['inventory'] as const;

export function useProducts() {
  return useQuery({
    queryKey: [...inventoryKey, 'products'],
    queryFn: fetchProducts,
    enabled: isSupabaseConfigured,
  });
}

export function useProduct(id?: string) {
  return useQuery({
    queryKey: [...inventoryKey, 'product', id],
    queryFn: () => fetchProductById(id!),
    enabled: isSupabaseConfigured && Boolean(id),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: [...inventoryKey, 'categories'],
    queryFn: fetchCategories,
    enabled: isSupabaseConfigured,
  });
}

export function useCategoryProducts(categoryId?: string) {
  return useQuery({
    queryKey: [...inventoryKey, 'category-products', categoryId],
    queryFn: () => fetchProductsByCategory(categoryId!),
    enabled: isSupabaseConfigured && Boolean(categoryId),
  });
}

export function useBrands() {
  return useQuery({
    queryKey: [...inventoryKey, 'brands'],
    queryFn: fetchBrands,
    enabled: isSupabaseConfigured,
  });
}

export function useAllStock() {
  return useQuery({
    queryKey: [...inventoryKey, 'all-stock'],
    queryFn: async () => (await fetchStockProducts()).map(mapAllStock),
    enabled: isSupabaseConfigured,
  });
}

export function useCurrentStock() {
  return useQuery({
    queryKey: [...inventoryKey, 'current-stock'],
    queryFn: async () => (await fetchStockProducts()).map(mapCurrentStock),
    enabled: isSupabaseConfigured,
  });
}

export function useStockPlanner() {
  return useQuery({
    queryKey: [...inventoryKey, 'stock-planner'],
    queryFn: async () => (await fetchStockProducts()).map(mapStockPlanner),
    enabled: isSupabaseConfigured,
  });
}

export function useInboundStock() {
  return useQuery({
    queryKey: [...inventoryKey, 'inbound'],
    queryFn: fetchInboundShipments,
    enabled: isSupabaseConfigured,
  });
}

export function useOutboundStock() {
  return useQuery({
    queryKey: [...inventoryKey, 'outbound'],
    queryFn: fetchOutboundShipments,
    enabled: isSupabaseConfigured,
  });
}

export function useCustomers() {
  return useQuery({
    queryKey: [...inventoryKey, 'customers'],
    queryFn: fetchCustomers,
    enabled: isSupabaseConfigured,
  });
}

export function useCustomer(id?: string) {
  return useQuery({
    queryKey: [...inventoryKey, 'customer', id],
    queryFn: () => fetchCustomerById(id!),
    enabled: isSupabaseConfigured && Boolean(id),
  });
}

export function useCustomerOrders(customerId?: string) {
  return useQuery({
    queryKey: [...inventoryKey, 'customer-orders', customerId],
    queryFn: () => fetchOrdersByCustomer(customerId!),
    enabled: isSupabaseConfigured && Boolean(customerId),
  });
}

export function useOrders() {
  return useQuery({
    queryKey: [...inventoryKey, 'orders'],
    queryFn: fetchOrders,
    enabled: isSupabaseConfigured,
  });
}

export function useOrder(id?: string) {
  return useQuery({
    queryKey: [...inventoryKey, 'order', id],
    queryFn: () => fetchOrderById(id!),
    enabled: isSupabaseConfigured && Boolean(id),
  });
}

export function useOrderItems(orderId?: string) {
  return useQuery({
    queryKey: [...inventoryKey, 'order-items', orderId],
    queryFn: () => fetchOrderItems(orderId),
    enabled: isSupabaseConfigured && Boolean(orderId),
  });
}

export function useOrderTracking(orderId?: string) {
  return useQuery({
    queryKey: [...inventoryKey, 'order-tracking', orderId],
    queryFn: () => fetchOrderTracking(orderId!),
    enabled: isSupabaseConfigured && Boolean(orderId),
  });
}

export function useCarriers() {
  return useQuery({
    queryKey: [...inventoryKey, 'carriers'],
    queryFn: fetchCarriers,
    enabled: isSupabaseConfigured,
  });
}

export function useProductVariants(productId?: string) {
  return useQuery({
    queryKey: [...inventoryKey, 'variants', productId],
    queryFn: () => fetchVariants(productId!),
    enabled: isSupabaseConfigured && Boolean(productId),
  });
}

export function useProductOptions(productId?: string) {
  return useQuery({
    queryKey: [...inventoryKey, 'options', productId],
    queryFn: () => fetchOptions(productId!),
    enabled: isSupabaseConfigured && Boolean(productId),
  });
}

function useInvalidateInventory() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: inventoryKey });
}

export function useCreateProduct() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: createProduct,
    onSuccess: invalidate,
  });
}

export function useUpdateProduct() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateProduct>[1] }) =>
      updateProduct(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteProduct() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: invalidate,
  });
}

export function useCreateCategory() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: createCategory,
    onSuccess: invalidate,
  });
}

export function useUpdateCategory() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateCategory>[1] }) =>
      updateCategory(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteCategory() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: invalidate,
  });
}

export function useUpdateStockLevel() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: ({
      productId,
      input,
    }: {
      productId: string;
      input: Parameters<typeof updateStockLevel>[1];
    }) => updateStockLevel(productId, input),
    onSuccess: invalidate,
  });
}

export function useDeleteInboundShipment() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: deleteInboundShipment,
    onSuccess: invalidate,
  });
}

export function useDeleteOutboundShipment() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: deleteOutboundShipment,
    onSuccess: invalidate,
  });
}

export function useCreateCustomer() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: createCustomer,
    onSuccess: invalidate,
  });
}

export function useUpdateCustomer() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateCustomer>[1] }) =>
      updateCustomer(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteCustomer() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: deleteCustomer,
    onSuccess: invalidate,
  });
}

export function useUpdateCustomersStatus() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: string }) =>
      updateCustomersStatus(ids, status),
    onSuccess: invalidate,
  });
}

export function useDeleteCustomers() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: deleteCustomers,
    onSuccess: invalidate,
  });
}

export function useDuplicateCustomers() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: (customers: CustomerListRow[]) => duplicateCustomers(customers),
    onSuccess: invalidate,
  });
}

export function useCreateOrder() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: createOrder,
    onSuccess: invalidate,
  });
}

export function useUpdateOrder() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateOrder>[1] }) =>
      updateOrder(id, input),
    onSuccess: invalidate,
  });
}

export function useUpdateOrderStatus() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: ({
      id,
      paymentStatus,
      deliveryStatus,
    }: {
      id: string;
      paymentStatus: string;
      deliveryStatus?: string;
    }) => updateOrderStatus(id, paymentStatus, deliveryStatus),
    onSuccess: invalidate,
  });
}

export function useDeleteOrder() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: deleteOrder,
    onSuccess: invalidate,
  });
}

export function useReplaceVariants() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: ({ productId, variants }: { productId: string; variants: ProductVariantRow[] }) =>
      replaceVariants(productId, variants),
    onSuccess: invalidate,
  });
}

export function useReplaceOptions() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: ({ productId, options }: { productId: string; options: ProductOptionCard[] }) =>
      replaceOptions(productId, options),
    onSuccess: invalidate,
  });
}

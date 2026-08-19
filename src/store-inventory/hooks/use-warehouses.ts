import { isSupabaseConfigured } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { warehouseListMockData } from '../data/warehouses';
import {
  invalidateKeys,
  patchListById,
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
  createWarehouse,
  deleteWarehouse,
  fetchWarehouseStock,
  fetchWarehouses,
  updateWarehouse,
  type WarehouseInput,
} from '../services/warehouses';
import type { WarehouseListRow } from '../types';
import { useMutation } from '@tanstack/react-query';

export function useWarehouses() {
  return useQuery({
    queryKey: inventoryKeys.warehouses(),
    queryFn: fetchWarehouses,
    enabled: isSupabaseConfigured,
    staleTime: REFERENCE_STALE_TIME,
  });
}

export function useWarehouseList() {
  const query = useWarehouses();
  return {
    ...query,
    data: isSupabaseConfigured ? query.data : (query.data ?? warehouseListMockData),
  };
}

export function useActiveWarehouses() {
  const query = useWarehouseList();
  return {
    ...query,
    data: (query.data ?? []).filter((row) => row.status.label.toLowerCase() === 'active'),
  };
}

export function useWarehouseStock(warehouseId?: string | null) {
  return useQuery({
    queryKey: inventoryKeys.warehouseStock(warehouseId ?? ''),
    queryFn: () => fetchWarehouseStock(warehouseId!),
    enabled: isSupabaseConfigured && Boolean(warehouseId),
  });
}

function useWarehouseMutation<TData, TVariables>(options: {
  mutationFn: (variables: TVariables) => Promise<TData>;
  apply?: (variables: TVariables) => unknown;
  onSuccess?: (data: TData, variables: TVariables, extras: unknown) => void;
}) {
  const queryClient = useQueryClient();
  const keys = [inventoryKeys.warehouses(), inventoryKeys.stock(), inventoryKeys.warehouseStock()];
  return useMutation({
    mutationFn: options.mutationFn,
    onMutate: async (variables) => {
      const previous = await snapshotQueries(queryClient, ...keys);
      const extras = options.apply?.(variables) ?? null;
      return { previous, extras };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) restoreQueries(queryClient, context.previous as QuerySnapshot);
      toastMutationError(error);
    },
    onSuccess: (data, variables, context) => {
      options.onSuccess?.(data, variables, context?.extras);
    },
    onSettled: () => {
      void invalidateKeys(queryClient, ...keys);
    },
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();
  return useWarehouseMutation({
    mutationFn: createWarehouse,
    apply: (input: WarehouseInput) => {
      const tempId = crypto.randomUUID();
      prependToList<WarehouseListRow>(queryClient, inventoryKeys.warehouses(), {
        id: tempId,
        code: input.code.toUpperCase(),
        name: input.name,
        address: input.address ?? null,
        city: input.city ?? null,
        country: input.country ?? null,
        phone: input.phone ?? null,
        status: { label: input.status ?? 'Active', variant: 'success' },
        isDefault: Boolean(input.isDefault),
        skuCount: 0,
        onHand: 0,
        created: 'Just now',
        updated: 'Just now',
      });
      return { tempId };
    },
    onSuccess: (id, _input, extras) => {
      const tempId = (extras as { tempId?: string } | null)?.tempId;
      if (tempId) replaceListItemId(queryClient, inventoryKeys.warehouses(), tempId, id);
    },
  });
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient();
  return useWarehouseMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<WarehouseInput> }) =>
      updateWarehouse(id, input),
    apply: ({ id, input }) => {
      patchListById<WarehouseListRow>(queryClient, inventoryKeys.warehouses(), id, (item) => ({
        ...item,
        code: input.code ? input.code.toUpperCase() : item.code,
        name: input.name ?? item.name,
        address: input.address !== undefined ? input.address : item.address,
        city: input.city !== undefined ? input.city : item.city,
        country: input.country !== undefined ? input.country : item.country,
        phone: input.phone !== undefined ? input.phone : item.phone,
        status: input.status
          ? { label: input.status, variant: input.status === 'Active' ? 'success' : 'destructive' }
          : item.status,
        isDefault: input.isDefault ?? item.isDefault,
        updated: 'Just now',
      }));
    },
  });
}

export function useDeleteWarehouse() {
  const queryClient = useQueryClient();
  return useWarehouseMutation({
    mutationFn: deleteWarehouse,
    apply: (id: string) => {
      removeFromList<WarehouseListRow>(queryClient, inventoryKeys.warehouses(), id);
    },
  });
}

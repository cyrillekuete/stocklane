import { isSupabaseConfigured } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { warehouseListMockData } from '../data/warehouses';
import {
  invalidateKeys,
  patchListById,
  prependToList,
  replaceListItemId,
  restoreQueries,
  snapshotQueries,
  toastMutationError,
  type QuerySnapshot,
} from '../lib/optimistic';
import { mapWarehouseError } from '../lib/warehouse-errors';
import { inventoryKeys, REFERENCE_STALE_TIME } from '../lib/query-keys';
import {
  createWarehouse,
  deleteWarehouse,
  fetchWarehouseStock,
  fetchWarehouses,
  fetchWarehousesWithStats,
  moveWarehouseStock,
  updateWarehouse,
  type WarehouseInput,
} from '../services/warehouses';
import type { WarehouseListRow } from '../types';
import { useMutation } from '@tanstack/react-query';

const warehouseCacheKeys = [
  inventoryKeys.warehouses(),
  inventoryKeys.warehousesWithStats(),
] as const;

function patchWarehouseCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  apply: (key: (typeof warehouseCacheKeys)[number]) => void,
) {
  for (const key of warehouseCacheKeys) apply(key);
}

/** Metadata-only warehouses (no stock table scan). Prefer for filters/selects/layout. */
export function useWarehouses() {
  return useQuery({
    queryKey: inventoryKeys.warehouses(),
    queryFn: fetchWarehouses,
    enabled: isSupabaseConfigured,
    staleTime: REFERENCE_STALE_TIME,
  });
}

/** Warehouses with skuCount/onHand — warehouse admin list only. */
export function useWarehouseList() {
  const query = useQuery({
    queryKey: inventoryKeys.warehousesWithStats(),
    queryFn: fetchWarehousesWithStats,
    enabled: isSupabaseConfigured,
    staleTime: REFERENCE_STALE_TIME,
  });
  return {
    ...query,
    data: isSupabaseConfigured ? query.data : (query.data ?? warehouseListMockData),
  };
}

export function useActiveWarehouses() {
  const query = useWarehouses();
  const data = isSupabaseConfigured
    ? query.data
    : (query.data ?? warehouseListMockData);
  return {
    ...query,
    data: (data ?? []).filter((row) => row.status.label.toLowerCase() === 'active'),
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
  // Prefix `warehouses()` also covers `warehousesWithStats` via React Query partial matching.
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
      toastMutationError(mapWarehouseError(error));
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
      if (input.isDefault) {
        patchWarehouseCaches(queryClient, (key) => {
          queryClient.setQueryData<WarehouseListRow[]>(key, (current) =>
            (current ?? []).map((item) => ({ ...item, isDefault: false })),
          );
        });
      }
      const row: WarehouseListRow = {
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
      };
      patchWarehouseCaches(queryClient, (key) => {
        prependToList<WarehouseListRow>(queryClient, key, row);
      });
      return { tempId };
    },
    onSuccess: (id, _input, extras) => {
      const tempId = (extras as { tempId?: string } | null)?.tempId;
      if (tempId) {
        patchWarehouseCaches(queryClient, (key) => {
          replaceListItemId(queryClient, key, tempId, id);
        });
      }
    },
  });
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient();
  return useWarehouseMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<WarehouseInput> }) =>
      updateWarehouse(id, input),
    apply: ({ id, input }) => {
      if (input.isDefault) {
        patchWarehouseCaches(queryClient, (key) => {
          queryClient.setQueryData<WarehouseListRow[]>(key, (current) =>
            (current ?? []).map((item) => ({
              ...item,
              isDefault: item.id === id,
            })),
          );
        });
      }
      patchWarehouseCaches(queryClient, (key) => {
        patchListById<WarehouseListRow>(queryClient, key, id, (item) => ({
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
      });
    },
  });
}

export function useDeleteWarehouse() {
  return useWarehouseMutation({
    mutationFn: deleteWarehouse,
    // Intentionally no optimistic remove — delete has preflight blockers and FK risks.
  });
}

export function useMoveWarehouseStock() {
  return useWarehouseMutation({
    mutationFn: ({
      fromWarehouseId,
      toWarehouseId,
    }: {
      fromWarehouseId: string;
      toWarehouseId: string;
    }) => moveWarehouseStock(fromWarehouseId, toWarehouseId),
  });
}

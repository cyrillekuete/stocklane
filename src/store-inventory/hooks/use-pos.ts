import { isSupabaseConfigured } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  invalidateKeys,
  patchListById,
  restoreQueries,
  snapshotQueries,
  toastMutationError,
  type QuerySnapshot,
} from '../lib/optimistic';
import { inventoryKeys } from '../lib/query-keys';
import {
  completePosSale,
  fetchPosCatalog,
  fetchPosSaleById,
  fetchPosSales,
  voidPosSale,
  type CompletePosSaleInput,
} from '../services/pos';
import type { PosSaleRow } from '../types';

export function usePosCatalog(warehouseId?: string | null) {
  return useQuery({
    queryKey: inventoryKeys.posCatalog(warehouseId ?? ''),
    queryFn: () => fetchPosCatalog(warehouseId!),
    enabled: isSupabaseConfigured && Boolean(warehouseId),
  });
}

export function usePosSales() {
  return useQuery({
    queryKey: inventoryKeys.posSales(),
    queryFn: fetchPosSales,
    enabled: isSupabaseConfigured,
  });
}

export function usePosSale(id?: string) {
  return useQuery({
    queryKey: inventoryKeys.posSale(id ?? ''),
    queryFn: () => fetchPosSaleById(id!),
    enabled: isSupabaseConfigured && Boolean(id),
  });
}

export function useCompletePosSale() {
  const queryClient = useQueryClient();
  const keys = [
    inventoryKeys.posSales(),
    inventoryKeys.stock(),
    inventoryKeys.warehouseStock(),
    inventoryKeys.posCatalog(),
  ];
  return useMutation({
    mutationFn: (input: CompletePosSaleInput) => completePosSale(input),
    onError: (error) => toastMutationError(error),
    onSuccess: (sale) => {
      if (sale) {
        queryClient.setQueryData(inventoryKeys.posSale(sale.id), sale);
      }
    },
    onSettled: () => {
      void invalidateKeys(queryClient, ...keys);
    },
  });
}

export function useVoidPosSale() {
  const queryClient = useQueryClient();
  const keys = [
    inventoryKeys.posSales(),
    inventoryKeys.stock(),
    inventoryKeys.warehouseStock(),
    inventoryKeys.posCatalog(),
  ];
  return useMutation({
    mutationFn: voidPosSale,
    onMutate: async (saleId) => {
      const previous = await snapshotQueries(queryClient, inventoryKeys.posSales());
      patchListById<PosSaleRow>(queryClient, inventoryKeys.posSales(), saleId, (item) => ({
        ...item,
        status: 'voided',
      }));
      return { previous };
    },
    onError: (error, _saleId, context) => {
      if (context?.previous) restoreQueries(queryClient, context.previous as QuerySnapshot);
      toastMutationError(error);
    },
    onSettled: (_data, _error, saleId) => {
      void invalidateKeys(queryClient, ...keys, inventoryKeys.posSale(saleId));
    },
  });
}

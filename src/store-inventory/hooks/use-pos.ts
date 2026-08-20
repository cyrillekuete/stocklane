import { isSupabaseConfigured } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  invalidateKeys,
  patchListById,
  restoreQueries,
  snapshotQueries,
  type QuerySnapshot,
} from '../lib/optimistic';
import { inventoryKeys } from '../lib/query-keys';
import {
  completePosSale,
  fetchPosCatalog,
  fetchPosSaleById,
  fetchPosSales,
  formatPosError,
  voidPosSale,
  type CompletePosSaleInput,
} from '../services/pos';
import type { PosSaleRow } from '../types';

export function usePosCatalog(warehouseId?: string | null) {
  return useQuery({
    queryKey: inventoryKeys.posCatalog(warehouseId ?? undefined),
    queryFn: () => fetchPosCatalog(warehouseId),
    enabled: isSupabaseConfigured,
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

const posSaleCacheKeys = [
  inventoryKeys.posSales(),
  inventoryKeys.stock(),
  inventoryKeys.warehouseStock(),
  inventoryKeys.posCatalog(),
  inventoryKeys.customers(),
  inventoryKeys.customerAccountTransactions(),
];

export function useCompletePosSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CompletePosSaleInput) => completePosSale(input),
    onError: (error) => {
      toast.error(formatPosError(error));
    },
    onSuccess: (sale) => {
      if (sale) {
        queryClient.setQueryData(inventoryKeys.posSale(sale.id), sale);
      }
    },
    onSettled: () => {
      void invalidateKeys(queryClient, ...posSaleCacheKeys);
    },
  });
}

export function useVoidPosSale() {
  const queryClient = useQueryClient();
  const keys = posSaleCacheKeys;
  return useMutation({
    mutationFn: ({ saleId, reason }: { saleId: string; reason?: string }) =>
      voidPosSale(saleId, { reason }),
    onMutate: async ({ saleId }) => {
      const previous = await snapshotQueries(queryClient, inventoryKeys.posSales());
      patchListById<PosSaleRow>(queryClient, inventoryKeys.posSales(), saleId, (item) => ({
        ...item,
        status: 'voided',
      }));
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) restoreQueries(queryClient, context.previous as QuerySnapshot);
      toast.error(formatPosError(error));
    },
    onSettled: (_data, _error, vars) => {
      void invalidateKeys(queryClient, ...keys, inventoryKeys.posSale(vars.saleId));
    },
  });
}

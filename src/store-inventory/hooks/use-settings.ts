import { isSupabaseConfigured } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { defaultStoreSettings } from '../data/settings';
import { invalidateKeys, restoreQueries, snapshotQueries, toastMutationError } from '../lib/optimistic';
import { inventoryKeys } from '../lib/query-keys';
import { fetchStoreSettings, updateStoreSettings } from '../services/settings';
import type { StoreSettings } from '../types';

const settingsKey = inventoryKeys.settings();

export function useStoreSettings() {
  return useQuery({
    queryKey: settingsKey,
    queryFn: fetchStoreSettings,
    enabled: isSupabaseConfigured,
    placeholderData: defaultStoreSettings,
  });
}

export function useUpdateStoreSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StoreSettings) => updateStoreSettings(input),
    onMutate: async (input) => {
      const previous = await snapshotQueries(queryClient, settingsKey);
      queryClient.setQueryData(settingsKey, input);
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) restoreQueries(queryClient, context.previous);
      toastMutationError(error);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(settingsKey, data);
    },
    onSettled: () => {
      void invalidateKeys(queryClient, settingsKey);
    },
  });
}

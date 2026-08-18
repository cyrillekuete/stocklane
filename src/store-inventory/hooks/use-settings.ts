import { isSupabaseConfigured } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { defaultStoreSettings } from '../data/settings';
import { fetchStoreSettings, updateStoreSettings } from '../services/settings';
import type { StoreSettings } from '../types';

const settingsKey = ['inventory', 'settings'] as const;

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
    onSuccess: (data) => {
      queryClient.setQueryData(settingsKey, data);
      void queryClient.invalidateQueries({ queryKey: settingsKey });
    },
  });
}

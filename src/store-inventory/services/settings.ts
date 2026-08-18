import { supabase } from '@/lib/supabase';
import {
  defaultStoreSettings,
  storeSettingsFromRow,
  storeSettingsToRow,
} from '../data/settings';
import type { StoreSettings } from '../types';

function requireClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  return supabase;
}

export async function fetchStoreSettings(): Promise<StoreSettings> {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_store_settings')
    .select('*')
    .eq('id', defaultStoreSettings.id)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    const { error: insertError } = await client
      .from('inventory_store_settings')
      .upsert(storeSettingsToRow(defaultStoreSettings), { onConflict: 'id' });
    if (insertError) throw insertError;
    return { ...defaultStoreSettings };
  }

  return storeSettingsFromRow(data as Record<string, unknown>);
}

export async function updateStoreSettings(input: StoreSettings): Promise<StoreSettings> {
  const client = requireClient();
  const payload = storeSettingsToRow({
    ...input,
    id: defaultStoreSettings.id,
  });

  const { data, error } = await client
    .from('inventory_store_settings')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) throw error;
  return storeSettingsFromRow(data as Record<string, unknown>);
}

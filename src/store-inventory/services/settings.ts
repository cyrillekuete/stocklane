import { supabase } from '@/lib/supabase';
import {
  defaultStoreSettings,
  storeSettingsFromRow,
  storeSettingsToRow,
} from '../data/settings';
import { mapSettingsError } from '../lib/settings-errors';
import { parseStoreSettings } from '../lib/settings-validation';
import type { StoreSettings } from '../types';

function requireClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  return supabase;
}

async function upsertViaRpc(input: StoreSettings): Promise<StoreSettings> {
  const client = requireClient();
  const parsed = parseStoreSettings(input);
  const payload = storeSettingsToRow({
    ...parsed,
    id: defaultStoreSettings.id,
  });

  const { data, error } = await client.rpc('inventory_upsert_store_settings', {
    payload,
  });

  if (error) throw mapSettingsError(error);
  if (!data || typeof data !== 'object') {
    throw new Error('Settings upsert returned no data');
  }
  return storeSettingsFromRow(data as Record<string, unknown>);
}

export async function fetchStoreSettings(): Promise<StoreSettings> {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_store_settings')
    .select('*')
    .eq('id', defaultStoreSettings.id)
    .maybeSingle();

  if (error) throw mapSettingsError(error);

  if (!data) {
    return upsertViaRpc(defaultStoreSettings);
  }

  return storeSettingsFromRow(data as Record<string, unknown>);
}

export async function updateStoreSettings(input: StoreSettings): Promise<StoreSettings> {
  try {
    return await upsertViaRpc(input);
  } catch (error) {
    throw mapSettingsError(error);
  }
}

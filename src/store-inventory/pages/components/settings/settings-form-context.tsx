'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { useT } from '@/i18n/use-t';
import { isSupabaseConfigured } from '@/lib/supabase';
import { defaultStoreSettings } from '@/store-inventory/data/settings';
import { useOrders } from '@/store-inventory/hooks/use-inventory';
import { useStoreSettings, useUpdateStoreSettings } from '@/store-inventory/hooks/use-settings';
import { mapSettingsError } from '@/store-inventory/lib/settings-errors';
import { settingsAreEqual } from '@/store-inventory/lib/settings-validation';
import type { StoreSettings } from '@/store-inventory/types';

type SettingsFormContextValue = {
  draft: StoreSettings;
  saved: StoreSettings;
  dirty: boolean;
  saving: boolean;
  loading: boolean;
  lastOrderLabel: string;
  updateDraft: (patch: Partial<StoreSettings>) => void;
  resetDraft: () => void;
  save: () => Promise<void>;
  exportSettings: () => void;
};

const SettingsFormContext = createContext<SettingsFormContextValue | null>(null);

export function SettingsFormProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const settingsQuery = useStoreSettings();
  const updateSettings = useUpdateStoreSettings();
  const ordersQuery = useOrders();
  const saved = settingsQuery.data ?? defaultStoreSettings;
  const [draft, setDraft] = useState<StoreSettings>(saved);
  const [hydrated, setHydrated] = useState(Boolean(settingsQuery.data));

  useEffect(() => {
    if (settingsQuery.data) {
      setDraft(settingsQuery.data);
      setHydrated(true);
    }
  }, [settingsQuery.data]);

  const dirty = hydrated && settingsAreEqual(draft, saved) === false;

  const lastOrderLabel = useMemo(() => {
    const latest = ordersQuery.data?.[0]?.date;
    return latest || t('No orders yet');
  }, [ordersQuery.data, t]);

  const updateDraft = useCallback((patch: Partial<StoreSettings>) => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(saved);
  }, [saved]);

  const save = useCallback(async () => {
    if (!isSupabaseConfigured) {
      toast.error(t('Supabase is not configured'));
      return;
    }
    try {
      const next = await updateSettings.mutateAsync(draft);
      setDraft(next);
      toast.success(t('Settings saved'));
    } catch (error) {
      toast.error(t(mapSettingsError(error).message));
    }
  }, [draft, updateSettings, t]);

  const exportSettings = useCallback(() => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${draft.storeCode || 'store'}-settings.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(dirty ? t('Draft settings exported (unsaved changes included)') : t('Settings exported'));
  }, [draft, dirty, t]);

  const value = useMemo<SettingsFormContextValue>(
    () => ({
      draft,
      saved,
      dirty,
      saving: updateSettings.isPending,
      loading: settingsQuery.isLoading && !settingsQuery.data,
      lastOrderLabel,
      updateDraft,
      resetDraft,
      save,
      exportSettings,
    }),
    [
      draft,
      saved,
      dirty,
      updateSettings.isPending,
      settingsQuery.isLoading,
      settingsQuery.data,
      lastOrderLabel,
      updateDraft,
      resetDraft,
      save,
      exportSettings,
    ],
  );

  return <SettingsFormContext.Provider value={value}>{children}</SettingsFormContext.Provider>;
}

export function useSettingsForm() {
  const context = useContext(SettingsFormContext);
  if (!context) {
    throw new Error('useSettingsForm must be used within SettingsFormProvider');
  }
  return context;
}

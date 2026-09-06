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
import { getSettingsFieldErrors, settingsAreEqual } from '@/store-inventory/lib/settings-validation';
import type { StoreSettings } from '@/store-inventory/types';

type SettingsFormContextValue = {
  draft: StoreSettings;
  saved: StoreSettings;
  dirty: boolean;
  saving: boolean;
  loading: boolean;
  lastOrderLabel: string;
  fieldErrors: Record<string, string>;
  updateDraft: (patch: Partial<StoreSettings>) => void;
  resetDraft: () => void;
  save: () => Promise<boolean>;
  exportSettings: () => void;
  validateAll: () => Record<string, string>;
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settingsQuery.data) {
      setDraft(settingsQuery.data);
      setFieldErrors({});
      setHydrated(true);
    }
  }, [settingsQuery.data]);

  const validateAll = useCallback(() => {
    const errors = getSettingsFieldErrors(draft);
    setFieldErrors(errors);
    return errors;
  }, [draft]);

  const dirty = hydrated && settingsAreEqual(draft, saved) === false;

  const lastOrderLabel = useMemo(() => {
    const orders = (ordersQuery.data ?? []) as Array<{ date?: string }>;
    const latest = orders[0]?.date;
    return latest || t('No orders yet');
  }, [ordersQuery.data, t]);

  const updateDraft = useCallback((patch: Partial<StoreSettings>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setFieldErrors((current) => {
      if (Object.keys(current).length === 0) return current;
      const next = { ...current };
      for (const key of Object.keys(patch)) {
        delete next[key];
      }
      if ('shippingZones' in patch) {
        for (const errorKey of Object.keys(next)) {
          if (errorKey.startsWith('shippingZone:')) delete next[errorKey];
        }
      }
      if ('locations' in patch) {
        for (const errorKey of Object.keys(next)) {
          if (errorKey.startsWith('location:')) delete next[errorKey];
        }
      }
      return next;
    });
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(saved);
    setFieldErrors({});
  }, [saved]);

  const save = useCallback(async () => {
    if (!isSupabaseConfigured) {
      toast.error(t('Supabase is not configured'));
      return false;
    }
    const errors = getSettingsFieldErrors(draft);
    setFieldErrors(errors);
    const firstError = Object.values(errors)[0];
    if (firstError) {
      toast.error(t(firstError));
      return false;
    }
    try {
      const next = await updateSettings.mutateAsync(draft);
      setDraft(next);
      setFieldErrors({});
      toast.success(t('Settings saved'));
      return true;
    } catch (error) {
      toast.error(t(mapSettingsError(error).message));
      return false;
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
      fieldErrors,
      updateDraft,
      resetDraft,
      save,
      exportSettings,
      validateAll,
    }),
    [
      draft,
      saved,
      dirty,
      updateSettings.isPending,
      settingsQuery.isLoading,
      settingsQuery.data,
      lastOrderLabel,
      fieldErrors,
      updateDraft,
      resetDraft,
      save,
      exportSettings,
      validateAll,
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

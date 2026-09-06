'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useT } from '@/i18n/use-t';
import { Badge, BadgeDot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useSettingsForm } from './settings/settings-form-context';
import { GeneralSettings } from './settings/general-settings';
import { Payments } from './settings/payments';
import { Checkout } from './settings/checkout';
import { ShippingDelivery } from './settings/shipping-delivery';
import { Locations } from './settings/locations';
import { Security } from './settings/security';
import { Notification } from './settings/notification';

const SETTINGS_TABS = [
  { value: 'general-settings', label: 'General Settings' },
  { value: 'payments', label: 'Payments' },
  { value: 'checkout', label: 'Checkout' },
  { value: 'shipping-delivery', label: 'Shipping & Delivery' },
  { value: 'locations', label: 'Locations' },
  { value: 'security', label: 'Security' },
  { value: 'notification', label: 'Notification' },
] as const;

function formatEstablished(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, 'd MMM, yyyy');
}

function SettingsSheetBody({
  open,
  onOpenChange,
  initialTab,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: string;
}) {
  const t = useT();
  const { draft, lastOrderLabel, dirty, saving, loading, fieldErrors, resetDraft, save } =
    useSettingsForm();
  const [activeTab, setActiveTab] = useState(
    SETTINGS_TABS.some((tab) => tab.value === initialTab) ? initialTab! : 'general-settings',
  );

  useEffect(() => {
    if (initialTab && SETTINGS_TABS.some((tab) => tab.value === initialTab)) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const errorCount = Object.keys(fieldErrors).length;

  const confirmDiscard = () => {
    if (!dirty) return true;
    return window.confirm(t('Discard unsaved settings changes?'));
  };

  const handleCancel = () => {
    if (!confirmDiscard()) return;
    resetDraft();
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (!confirmDiscard()) return;
      resetDraft();
    }
    onOpenChange(nextOpen);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="gap-0 lg:w-[1000px] sm:max-w-none inset-5 border start-auto h-auto rounded-lg p-0 [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="border-b py-3.5 px-5 border-border">
          <SheetTitle className="font-medium">{t('Settings')}</SheetTitle>
        </SheetHeader>

        <SheetBody className="p-0 grow">
          <div className="flex justify-between flex-wrap gap-2 border-b border-border px-5 py-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <span className="lg:text-[22px] font-semibold text-foreground leading-none">
                  {draft.storeName}
                </span>
                <Badge size="sm" variant="success" appearance="light">
                  {t(draft.status)}
                </Badge>
              </div>
              <div className="flex items-center flex-wrap gap-2 text-2sm">
                <span className="font-normal text-muted-foreground">{t('Store ID')}:</span>
                <span className="font-medium text-foreground">{draft.storeCode}</span>
                <BadgeDot className="bg-muted-foreground size-1" />
                <span className="font-normal text-muted-foreground">{t('Established')}</span>
                <span className="font-medium text-foreground">
                  {formatEstablished(draft.establishedAt)}
                </span>
                <BadgeDot className="bg-muted-foreground size-1" />
                <span className="font-normal text-muted-foreground">{t('Last Order')}</span>
                <span className="font-medium text-foreground">{lastOrderLabel}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Button variant="ghost" onClick={() => handleClose(false)}>
                {t('Close')}
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={!dirty || saving}>
                {t('Cancel')}
              </Button>
              <Button variant="mono" onClick={() => void save()} disabled={!dirty || saving || loading}>
                {saving ? t('Saving...') : t('Save')}
              </Button>
            </div>
          </div>
          <div className="flex flex-col h-[calc(100dvh-22rem)]">
            <div className="flex flex-wrap lg:flex-nowrap py-5 px-2 grow">
              {loading ? (
                <div className="px-5 py-8 text-sm text-muted-foreground">{t('Loading settings…')}</div>
              ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="text-2sm text-muted-foreground w-full space-y-3">
                <div className="px-3">
                  <div className="overflow-x-auto">
                    <TabsList className="inline-flex whitespace-nowrap border border-border/80 bg-muted/80 [&_[data-slot=tabs-trigger]]:text-foreground [&_[data-slot=tabs-trigger]]:font-normal [&_[data-slot=tabs-trigger][data-state=active]]:shadow-lg">
                      {SETTINGS_TABS.map((tab) => (
                        <TabsTrigger key={tab.value} value={tab.value}>
                          {t(tab.label)}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                </div>

                <ScrollArea className="px-3">
                  {errorCount > 0 ? (
                    <p role="alert" aria-live="polite" className="px-1 pb-1 text-xs font-normal text-destructive">
                      {t('{count} fields need attention', { count: errorCount })}
                    </p>
                  ) : null}
                  <fieldset disabled={saving} className="contents">
                  <TabsContent value="general-settings" className="lg:h-[calc(100dvh-22.5rem)] h-[calc(100dvh-27.2rem)]">
                    <GeneralSettings />
                  </TabsContent>
                  <TabsContent value="payments" className="lg:h-[calc(100dvh-22.4rem)] h-[calc(100dvh-27.1rem)]">
                    <Payments />
                  </TabsContent>
                  <TabsContent value="checkout" className="lg:h-[calc(100dvh-22.4rem)] h-[calc(100dvh-27.1rem)]">
                    <Checkout />
                  </TabsContent>
                  <TabsContent value="shipping-delivery" className="lg:h-[calc(100dvh-22.4rem)] h-[calc(100dvh-27.1rem)]">
                    <ShippingDelivery />
                  </TabsContent>
                  <TabsContent value="locations" className="lg:h-[calc(100dvh-22.4rem)] h-[calc(100dvh-27.1rem)]">
                    <Locations />
                  </TabsContent>
                  <TabsContent value="security" className="lg:h-[calc(100dvh-22.4rem)] h-[calc(100dvh-27.1rem)]">
                    <Security />
                  </TabsContent>
                  <TabsContent value="notification" className="lg:h-[calc(100dvh-22.4rem)] h-[calc(100dvh-27.1rem)]">
                    <Notification />
                  </TabsContent>
                  </fieldset>
                </ScrollArea>
              </Tabs>
              )}
            </div>
          </div>
        </SheetBody>

        <SheetFooter className="flex-row border-t pb-4 p-5 border-border gap-2.5 lg:gap-0">
          <Button variant="ghost" onClick={() => handleClose(false)}>
            {t('Close')}
          </Button>
          <Button variant="outline" onClick={handleCancel} disabled={!dirty || saving}>
            {t('Cancel')}
          </Button>
          <Button variant="mono" onClick={() => void save()} disabled={!dirty || saving || loading}>
            {saving ? t('Saving...') : t('Save')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function SettingsSheet({
  open,
  onOpenChange,
  initialTab,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditClick?: () => void;
  initialTab?: string;
}) {
  return <SettingsSheetBody open={open} onOpenChange={onOpenChange} initialTab={initialTab} />;
}

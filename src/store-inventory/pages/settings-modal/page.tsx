'use client';

import { format } from 'date-fns';
import { Upload, Settings } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SettingsSheet } from '../components/settings-sheet';
import { SettingsFormProvider, useSettingsForm } from '../components/settings/settings-form-context';

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, 'd MMM yyyy, HH:mm');
}

function SettingsOverview() {
  const { draft, lastOrderLabel, exportSettings } = useSettingsForm();
  const [searchParams] = useSearchParams();
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(true);
  const initialTab = searchParams.get('tab') ?? undefined;

  const established = useMemo(() => {
    const date = new Date(draft.establishedAt);
    if (Number.isNaN(date.getTime())) return draft.establishedAt;
    return format(date, 'd MMM, yyyy');
  }, [draft.establishedAt]);

  return (
    <div className="container-fluid space-y-5 lg:space-y-9">
      <div className="flex items-center flex-wrap gap-2 justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground">Store Settings</h1>
          <span className="text-sm text-muted-foreground">
            Manage store identity, payments, checkout, shipping, and notifications
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 shrink-0" onClick={exportSettings}>
            <Upload className="h-4 w-4" />
            Export Settings
          </Button>
          <Button variant="mono" onClick={() => setSettingsSheetOpen(true)}>
            <Settings />
            Open Settings
          </Button>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Card>
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{draft.storeName}</h2>
              <Badge size="sm" variant="success" appearance="light">
                {draft.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">Store ID {draft.storeCode}</p>
            <p className="text-sm text-muted-foreground">Established {established}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Last saved</h3>
            <p className="text-lg font-semibold">{formatTimestamp(draft.updatedAt)}</p>
            <p className="text-sm text-muted-foreground">{draft.contactEmail || 'No contact email'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Last order</h3>
            <p className="text-lg font-semibold">{lastOrderLabel}</p>
            <p className="text-sm text-muted-foreground">Currency {draft.currency}</p>
          </CardContent>
        </Card>
      </div>

      <SettingsSheet
        open={settingsSheetOpen}
        onOpenChange={setSettingsSheetOpen}
        initialTab={initialTab}
      />
    </div>
  );
}

export function SettingsModal() {
  return (
    <SettingsFormProvider>
      <SettingsOverview />
    </SettingsFormProvider>
  );
}

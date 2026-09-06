'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from '@/i18n/use-t';
import { useSettingsForm } from "./settings-form-context";
import { FieldError } from "./components/number-field";
import type { StoreLocation } from "@/store-inventory/types";

export function Locations() {
  const t = useT();
  const { draft, updateDraft, fieldErrors } = useSettingsForm();

  const updateLocation = (id: string, patch: Partial<StoreLocation>) => {
    if (patch.isDefault === false) {
      const current = draft.locations.find((location) => location.id === id);
      if (current?.isDefault && draft.locations.length > 1) {
        toast.error(t('Select another location as default first'));
        return;
      }
      if (current?.isDefault && draft.locations.length === 1) {
        toast.error(t('At least one default location is required'));
        return;
      }
    }

    updateDraft({
      locations: draft.locations.map((location) => {
        if (location.id !== id) {
          return patch.isDefault ? { ...location, isDefault: false } : location;
        }
        return { ...location, ...patch };
      }),
    });
  };

  const addLocation = () => {
    updateDraft({
      locations: [
        ...draft.locations,
        {
          id: crypto.randomUUID(),
          name: 'New location',
          address: '',
          city: '',
          country: 'FR',
          phone: '',
          isDefault: draft.locations.length === 0,
        },
      ],
    });
  };

  const removeLocation = (id: string) => {
    const remaining = draft.locations.filter((location) => location.id !== id);
    if (remaining.length && !remaining.some((location) => location.isDefault)) {
      remaining[0] = { ...remaining[0], isDefault: true };
    }
    updateDraft({ locations: remaining });
  };

  return (
    <div className="space-y-5">
      <Card className="bg-accent/70 rounded-md shadow-none flex flex-col">
        <CardContent className="p-0 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground py-2.5 ps-2">{t('Store Locations')}</h3>
            <Button variant="outline" size="sm" className="me-2" onClick={addLocation}>
              <Plus className="size-4" />
              {t('Add location')}
            </Button>
          </div>
          <div className="bg-background rounded-md m-1 mt-0 border border-input p-5 space-y-4">
            {draft.locations.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('No locations yet.')}</p>
            ) : (
              draft.locations.map((location) => (
                <div key={location.id} className="space-y-3 rounded-md border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="grow space-y-1.5">
                      <Input
                        value={location.name}
                        onChange={(e) => updateLocation(location.id, { name: e.target.value })}
                        placeholder={t('Location name')}
                        aria-label={t('Location name')}
                        aria-invalid={Boolean(fieldErrors[`location:${location.id}:name`])}
                      />
                      <FieldError message={fieldErrors[`location:${location.id}:name`]} />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        size="sm"
                        checked={location.isDefault}
                        onCheckedChange={(isDefault) => updateLocation(location.id, { isDefault })}
                      />
                      <Label className="text-xs">{t('Default')}</Label>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      value={location.address}
                      onChange={(e) => updateLocation(location.id, { address: e.target.value })}
                      placeholder={t('Street address')}
                    />
                    <Input
                      value={location.city}
                      onChange={(e) => updateLocation(location.id, { city: e.target.value })}
                      placeholder={t('City')}
                    />
                    <Input
                      value={location.country}
                      onChange={(e) => updateLocation(location.id, { country: e.target.value })}
                      placeholder={t('Country')}
                    />
                    <Input
                      value={location.phone}
                      onChange={(e) => updateLocation(location.id, { phone: e.target.value })}
                      placeholder={t('Phone')}
                    />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeLocation(location.id)}>
                    <Trash2 className="size-4" />
                    {t('Remove')}
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

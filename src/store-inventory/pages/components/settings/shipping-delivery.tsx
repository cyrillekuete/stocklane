'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { clampNonNegativeNumber } from "@/store-inventory/lib/settings-validation";
import { useT } from '@/i18n/use-t';
import { useSettingsForm } from "./settings-form-context";
import type { ShippingZone } from "@/store-inventory/types";

const carriers = ['DHL', 'FedEx', 'UPS', 'USPS', 'Chronopost', 'Colissimo'];

export function ShippingDelivery() {
  const t = useT();
  const { draft, updateDraft } = useSettingsForm();

  const updateZone = (id: string, patch: Partial<ShippingZone>) => {
    updateDraft({
      shippingZones: draft.shippingZones.map((zone) => (zone.id === id ? { ...zone, ...patch } : zone)),
    });
  };

  const addZone = () => {
    updateDraft({
      shippingZones: [
        ...draft.shippingZones,
        {
          id: crypto.randomUUID(),
          name: 'New zone',
          countries: [],
          rate: 0,
          estimatedDays: '5-7',
        },
      ],
    });
  };

  const removeZone = (id: string) => {
    updateDraft({ shippingZones: draft.shippingZones.filter((zone) => zone.id !== id) });
  };

  return (
    <div className="space-y-5">
      <Card className="bg-accent/70 rounded-md shadow-none flex flex-col">
        <CardContent className="p-0 flex flex-col">
          <h3 className="text-sm font-medium text-foreground py-2.5 ps-2">{t('Shipping Options')}</h3>
          <div className="bg-background rounded-md m-1 mt-0 border border-input p-5 space-y-5">
            <div className="flex items-start gap-5">
              <div className="flex flex-col gap-0.5 basis-1/3">
                <Label className="text-2sm font-medium shrink-0">{t('Free shipping')}</Label>
                <span className="text-xs font-normal text-muted-foreground">{t('Offer free shipping above a minimum order')}</span>
              </div>
              <div className="basis-2/3 space-y-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id="free-shipping"
                    size="sm"
                    checked={draft.freeShippingEnabled}
                    onCheckedChange={(freeShippingEnabled) => updateDraft({ freeShippingEnabled })}
                  />
                  <Label htmlFor="free-shipping">{draft.freeShippingEnabled ? t('Active') : t('Inactive')}</Label>
                </div>
                <Input
                  type="number"
                  min={0}
                  disabled={!draft.freeShippingEnabled}
                  value={draft.freeShippingMin}
                  onChange={(e) => {
                    const raw = Number(e.target.value);
                    updateDraft({
                      freeShippingMin: Number.isFinite(raw) ? clampNonNegativeNumber(raw) : 0,
                    });
                  }}
                  placeholder={t('Minimum order amount')}
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-5">
              <div className="flex flex-col gap-0.5 basis-1/3">
                <Label className="text-2sm font-medium shrink-0">{t('Local pickup')}</Label>
                <span className="text-xs font-normal text-muted-foreground">{t('Allow customers to collect orders in store')}</span>
              </div>
              <div className="basis-2/3 flex items-center gap-2">
                <Switch
                  id="local-pickup"
                  size="sm"
                  checked={draft.localPickup}
                  onCheckedChange={(localPickup) => updateDraft({ localPickup })}
                />
                <Label htmlFor="local-pickup">{draft.localPickup ? t('Available') : t('Unavailable')}</Label>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-5">
              <div className="flex flex-col gap-0.5 basis-1/3">
                <Label className="text-2sm font-medium shrink-0">{t('Express shipping')}</Label>
                <span className="text-xs font-normal text-muted-foreground">{t('Offer a faster paid shipping option')}</span>
              </div>
              <div className="basis-2/3 flex items-center gap-2">
                <Switch
                  id="express-shipping"
                  size="sm"
                  checked={draft.expressShipping}
                  onCheckedChange={(expressShipping) => updateDraft({ expressShipping })}
                />
                <Label htmlFor="express-shipping">{draft.expressShipping ? t('Available') : t('Unavailable')}</Label>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-5">
              <div className="flex flex-col gap-0.5 basis-1/3">
                <Label className="text-2sm font-medium shrink-0">{t('Shipping origin')}</Label>
                <span className="text-xs font-normal text-muted-foreground">{t('City and country packages ship from')}</span>
              </div>
              <Input
                className="basis-2/3"
                value={draft.shippingOrigin ?? ''}
                onChange={(e) => updateDraft({ shippingOrigin: e.target.value })}
                placeholder="Paris, FR"
              />
            </div>

            <Separator />

            <div className="flex items-start gap-5">
              <div className="flex flex-col gap-0.5 basis-1/3">
                <Label className="text-2sm font-medium shrink-0">{t('Default carrier')}</Label>
                <span className="text-xs font-normal text-muted-foreground">{t('Carrier used unless a zone overrides it')}</span>
              </div>
              <div className="basis-2/3">
                <Select
                  value={draft.defaultCarrier ?? 'DHL'}
                  onValueChange={(defaultCarrier) => updateDraft({ defaultCarrier })}
                  indicatorPosition="right"
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('Select carrier')} />
                  </SelectTrigger>
                  <SelectContent>
                    {carriers.map((carrier) => (
                      <SelectItem key={carrier} value={carrier}>
                        {carrier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-5">
              <div className="flex flex-col gap-0.5 basis-1/3">
                <Label className="text-2sm font-medium shrink-0">{t('Handling days')}</Label>
                <span className="text-xs font-normal text-muted-foreground">{t('Days needed to prepare an order')}</span>
              </div>
              <Input
                className="basis-2/3"
                type="number"
                min={0}
                value={draft.handlingDays}
                onChange={(e) => {
                  const raw = Number(e.target.value);
                  updateDraft({
                    handlingDays: Number.isFinite(raw)
                      ? Math.trunc(clampNonNegativeNumber(raw))
                      : 0,
                  });
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-accent/70 rounded-md shadow-none flex flex-col">
        <CardContent className="p-0 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground py-2.5 ps-2">{t('Shipping Zones')}</h3>
            <Button variant="outline" size="sm" className="me-2" onClick={addZone}>
              <Plus className="size-4" />
              {t('Add zone')}
            </Button>
          </div>
          <div className="bg-background rounded-md m-1 mt-0 border border-input p-5 space-y-4">
            {draft.shippingZones.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('No shipping zones yet.')}</p>
            ) : (
              draft.shippingZones.map((zone) => (
                <div key={zone.id} className="grid gap-3 rounded-md border border-border p-4 md:grid-cols-4">
                  <Input
                    value={zone.name}
                    onChange={(e) => updateZone(zone.id, { name: e.target.value })}
                    placeholder={t('Zone name')}
                  />
                  <Input
                    type="number"
                    min={0}
                    value={zone.rate}
                    onChange={(e) => {
                      const raw = Number(e.target.value);
                      updateZone(zone.id, {
                        rate: Number.isFinite(raw) ? clampNonNegativeNumber(raw) : 0,
                      });
                    }}
                    placeholder={t('Rate')}
                  />
                  <Input
                    value={zone.estimatedDays}
                    onChange={(e) => updateZone(zone.id, { estimatedDays: e.target.value })}
                    placeholder={t('3-5 days')}
                  />
                  <Button variant="ghost" size="sm" onClick={() => removeZone(zone.id)}>
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

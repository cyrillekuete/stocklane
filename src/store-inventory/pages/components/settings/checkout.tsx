'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettingsForm } from "./settings-form-context";
import { checkoutCountries } from "./components/general-settings/basics";
import { useT } from '@/i18n/use-t';

export function Checkout() {
  const t = useT();
  const { draft, updateDraft } = useSettingsForm();

  return (
    <div className="space-y-5">
      <Card className="bg-accent/70 rounded-md shadow-none h-full flex flex-col">
        <CardContent className="p-0 flex flex-col h-full">
          <h3 className="text-sm font-medium text-foreground py-2.5 ps-2">{t('Checkout Options')}</h3>
          <div className="bg-background rounded-md m-1 mt-0 border border-input p-5 space-y-5 h-full">
            <div className="flex items-start gap-5">
              <div className="flex flex-col gap-0.5 basis-1/3">
                <Label className="text-2sm font-medium shrink-0">{t('Guest checkout')}</Label>
                <span className="text-xs font-normal text-muted-foreground">{t('Allow customers to order without an account')}</span>
              </div>
              <div className="basis-2/3 flex items-center gap-2">
                <Switch
                  id="guest-checkout"
                  size="sm"
                  checked={draft.guestCheckout}
                  onCheckedChange={(guestCheckout) => updateDraft({ guestCheckout })}
                />
                <Label htmlFor="guest-checkout">{draft.guestCheckout ? t('Active') : t('Inactive')}</Label>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-5">
              <div className="flex flex-col gap-0.5 basis-1/3">
                <Label className="text-2sm font-medium shrink-0">{t('Collect phone number')}</Label>
                <span className="text-xs font-normal text-muted-foreground">{t('Require a phone number at checkout')}</span>
              </div>
              <div className="basis-2/3 flex items-center gap-2">
                <Switch
                  id="collect-phone"
                  size="sm"
                  checked={draft.collectPhone}
                  onCheckedChange={(collectPhone) => updateDraft({ collectPhone })}
                />
                <Label htmlFor="collect-phone">{draft.collectPhone ? t('Required') : t('Optional')}</Label>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-5">
              <div className="flex flex-col gap-0.5 basis-1/3">
                <Label className="text-2sm font-medium shrink-0">{t('Order notes')}</Label>
                <span className="text-xs font-normal text-muted-foreground">{t('Let customers add notes to an order')}</span>
              </div>
              <div className="basis-2/3 flex items-center gap-2">
                <Switch
                  id="order-notes"
                  size="sm"
                  checked={draft.orderNotes}
                  onCheckedChange={(orderNotes) => updateDraft({ orderNotes })}
                />
                <Label htmlFor="order-notes">{draft.orderNotes ? t('Enabled') : t('Disabled')}</Label>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-5">
              <div className="flex flex-col gap-0.5 basis-1/3">
                <Label className="text-2sm font-medium shrink-0">{t('Require terms acceptance')}</Label>
                <span className="text-xs font-normal text-muted-foreground">{t('Customers must accept terms before paying')}</span>
              </div>
              <div className="basis-2/3 flex items-center gap-2">
                <Switch
                  id="terms-required"
                  size="sm"
                  checked={draft.termsRequired}
                  onCheckedChange={(termsRequired) => updateDraft({ termsRequired })}
                />
                <Label htmlFor="terms-required">{draft.termsRequired ? t('Required') : t('Optional')}</Label>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-5">
              <div className="flex flex-col gap-0.5 basis-1/3">
                <Label className="text-2sm font-medium shrink-0">{t('Abandoned cart emails')}</Label>
                <span className="text-xs font-normal text-muted-foreground">{t('Send a reminder when checkout is left incomplete')}</span>
              </div>
              <div className="basis-2/3 flex items-center gap-2">
                <Switch
                  id="abandoned-cart"
                  size="sm"
                  checked={draft.abandonedCartEmail}
                  onCheckedChange={(abandonedCartEmail) => updateDraft({ abandonedCartEmail })}
                />
                <Label htmlFor="abandoned-cart">{draft.abandonedCartEmail ? t('Active') : t('Inactive')}</Label>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-5">
              <div className="flex flex-col gap-0.5 basis-1/3">
                <Label className="text-2sm font-medium shrink-0">{t('Default checkout country')}</Label>
                <span className="text-xs font-normal text-muted-foreground">{t('Pre-selected country on the checkout form')}</span>
              </div>
              <div className="basis-2/3">
                <Select
                  value={draft.defaultCheckoutCountry}
                  onValueChange={(defaultCheckoutCountry) => updateDraft({ defaultCheckoutCountry })}
                  indicatorPosition="right"
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('Select country')} />
                  </SelectTrigger>
                  <SelectContent>
                    {checkoutCountries.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {t(country.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

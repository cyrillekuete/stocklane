'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Input, InputAddon, InputGroup } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Mail } from "lucide-react";
import { useT } from '@/i18n/use-t';
import { useSettingsForm } from "./settings-form-context";
import { FieldError } from "./components/number-field";

export function Notification() {
  const t = useT();
  const { draft, updateDraft, fieldErrors } = useSettingsForm();

  return (
    <div className="space-y-5">
      <Card className="bg-accent/70 rounded-md shadow-none flex flex-col">
        <CardContent className="p-0 flex flex-col">
          <h3 className="text-sm font-medium text-foreground py-2.5 ps-2">{t('Email Notifications')}</h3>
          <div className="bg-background rounded-md m-1 mt-0 border border-input p-5 space-y-5">
            <div className="flex items-start gap-5">
              <div className="flex flex-col gap-0.5 basis-1/3">
                <Label className="text-2sm font-medium shrink-0">{t('Order confirmation')}</Label>
                <span className="text-xs font-normal text-muted-foreground">{t('Send customers a receipt after checkout')}</span>
              </div>
              <div className="basis-2/3 flex items-center gap-2">
                <Switch
                  id="email-order"
                  size="sm"
                  checked={draft.emailOrderConfirm}
                  onCheckedChange={(emailOrderConfirm) => updateDraft({ emailOrderConfirm })}
                />
                <Label htmlFor="email-order">{draft.emailOrderConfirm ? t('Active') : t('Inactive')}</Label>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-5">
              <div className="flex flex-col gap-0.5 basis-1/3">
                <Label className="text-2sm font-medium shrink-0">{t('Shipping updates')}</Label>
                <span className="text-xs font-normal text-muted-foreground">{t('Notify customers when an order ships')}</span>
              </div>
              <div className="basis-2/3 flex items-center gap-2">
                <Switch
                  id="email-shipping"
                  size="sm"
                  checked={draft.emailShippingUpdates}
                  onCheckedChange={(emailShippingUpdates) => updateDraft({ emailShippingUpdates })}
                />
                <Label htmlFor="email-shipping">{draft.emailShippingUpdates ? t('Active') : t('Inactive')}</Label>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-5">
              <div className="flex flex-col gap-0.5 basis-1/3">
                <Label className="text-2sm font-medium shrink-0">{t('Low stock alerts')}</Label>
                <span className="text-xs font-normal text-muted-foreground">{t('Email staff when inventory hits a threshold')}</span>
              </div>
              <div className="basis-2/3 flex items-center gap-2">
                <Switch
                  id="email-low-stock"
                  size="sm"
                  checked={draft.emailLowStock}
                  onCheckedChange={(emailLowStock) => updateDraft({ emailLowStock })}
                />
                <Label htmlFor="email-low-stock">{draft.emailLowStock ? t('Active') : t('Inactive')}</Label>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-5">
              <div className="flex flex-col gap-0.5 basis-1/3">
                <Label className="text-2sm font-medium shrink-0">{t('New customer')}</Label>
                <span className="text-xs font-normal text-muted-foreground">{t('Notify staff when a customer account is created')}</span>
              </div>
              <div className="basis-2/3 flex items-center gap-2">
                <Switch
                  id="email-new-customer"
                  size="sm"
                  checked={draft.emailNewCustomer}
                  onCheckedChange={(emailNewCustomer) => updateDraft({ emailNewCustomer })}
                />
                <Label htmlFor="email-new-customer">{draft.emailNewCustomer ? t('Active') : t('Inactive')}</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-accent/70 rounded-md shadow-none flex flex-col">
        <CardContent className="p-0 flex flex-col">
          <h3 className="text-sm font-medium text-foreground py-2.5 ps-2">{t('Other Notifications')}</h3>
          <div className="bg-background rounded-md m-1 mt-0 border border-input p-5 space-y-5">
            <div className="flex items-start gap-5">
              <div className="flex flex-col gap-0.5 basis-1/3">
                <Label className="text-2sm font-medium shrink-0">{t('SMS order updates')}</Label>
                <span className="text-xs font-normal text-muted-foreground">{t('Send shipping updates by text message')}</span>
              </div>
              <div className="basis-2/3 flex items-center gap-2">
                <Switch
                  id="sms-updates"
                  size="sm"
                  checked={draft.smsOrderUpdates}
                  onCheckedChange={(smsOrderUpdates) => updateDraft({ smsOrderUpdates })}
                />
                <Label htmlFor="sms-updates">{draft.smsOrderUpdates ? t('Active') : t('Inactive')}</Label>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-5">
              <div className="flex flex-col gap-0.5 basis-1/3">
                <Label className="text-2sm font-medium shrink-0">{t('Staff notify email')}</Label>
                <span className="text-xs font-normal text-muted-foreground">{t('Inbox that receives operational alerts')}</span>
              </div>
              <div className="basis-2/3 space-y-1.5">
                <InputGroup>
                  <InputAddon mode="icon">
                    <Mail />
                  </InputAddon>
                  <Input
                    type="email"
                    placeholder="ops@mystore.io"
                    value={draft.notifyEmail ?? ''}
                    onChange={(e) => updateDraft({ notifyEmail: e.target.value })}
                    aria-invalid={Boolean(fieldErrors.notifyEmail)}
                  />
                </InputGroup>
                <FieldError message={fieldErrors.notifyEmail} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

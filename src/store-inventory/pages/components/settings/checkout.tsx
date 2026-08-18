'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettingsForm } from "./settings-form-context";
import { checkoutCountries } from "./components/general-settings/basics";

export function Checkout() {
  const { draft, updateDraft } = useSettingsForm();

  return (
    <div className="space-y-5">
      <Card className="bg-accent/70 rounded-md shadow-none h-full flex flex-col">
        <CardContent className="p-0 flex flex-col h-full">
          <h3 className="text-sm font-medium text-foreground py-2.5 ps-2">Checkout Options</h3>
          <div className="bg-background rounded-md m-1 mt-0 border border-input p-5 space-y-5 h-full">
            <div className="flex items-start gap-5">
              <div className="flex flex-col gap-0.5 basis-1/3">
                <Label className="text-2sm font-medium shrink-0">Guest checkout</Label>
                <span className="text-xs font-normal text-muted-foreground">Allow customers to order without an account</span>
              </div>
              <div className="basis-2/3 flex items-center gap-2">
                <Switch
                  id="guest-checkout"
                  size="sm"
                  checked={draft.guestCheckout}
                  onCheckedChange={(guestCheckout) => updateDraft({ guestCheckout })}
                />
                <Label htmlFor="guest-checkout">{draft.guestCheckout ? 'Active' : 'Inactive'}</Label>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-5">
              <div className="flex flex-col gap-0.5 basis-1/3">
                <Label className="text-2sm font-medium shrink-0">Collect phone number</Label>
                <span className="text-xs font-normal text-muted-foreground">Require a phone number at checkout</span>
              </div>
              <div className="basis-2/3 flex items-center gap-2">
                <Switch
                  id="collect-phone"
                  size="sm"
                  checked={draft.collectPhone}
                  onCheckedChange={(collectPhone) => updateDraft({ collectPhone })}
                />
                <Label htmlFor="collect-phone">{draft.collectPhone ? 'Required' : 'Optional'}</Label>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-5">
              <div className="flex flex-col gap-0.5 basis-1/3">
                <Label className="text-2sm font-medium shrink-0">Order notes</Label>
                <span className="text-xs font-normal text-muted-foreground">Let customers add notes to an order</span>
              </div>
              <div className="basis-2/3 flex items-center gap-2">
                <Switch
                  id="order-notes"
                  size="sm"
                  checked={draft.orderNotes}
                  onCheckedChange={(orderNotes) => updateDraft({ orderNotes })}
                />
                <Label htmlFor="order-notes">{draft.orderNotes ? 'Enabled' : 'Disabled'}</Label>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-5">
              <div className="flex flex-col gap-0.5 basis-1/3">
                <Label className="text-2sm font-medium shrink-0">Require terms acceptance</Label>
                <span className="text-xs font-normal text-muted-foreground">Customers must accept terms before paying</span>
              </div>
              <div className="basis-2/3 flex items-center gap-2">
                <Switch
                  id="terms-required"
                  size="sm"
                  checked={draft.termsRequired}
                  onCheckedChange={(termsRequired) => updateDraft({ termsRequired })}
                />
                <Label htmlFor="terms-required">{draft.termsRequired ? 'Required' : 'Optional'}</Label>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-5">
              <div className="flex flex-col gap-0.5 basis-1/3">
                <Label className="text-2sm font-medium shrink-0">Abandoned cart emails</Label>
                <span className="text-xs font-normal text-muted-foreground">Send a reminder when checkout is left incomplete</span>
              </div>
              <div className="basis-2/3 flex items-center gap-2">
                <Switch
                  id="abandoned-cart"
                  size="sm"
                  checked={draft.abandonedCartEmail}
                  onCheckedChange={(abandonedCartEmail) => updateDraft({ abandonedCartEmail })}
                />
                <Label htmlFor="abandoned-cart">{draft.abandonedCartEmail ? 'Active' : 'Inactive'}</Label>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-5">
              <div className="flex flex-col gap-0.5 basis-1/3">
                <Label className="text-2sm font-medium shrink-0">Default checkout country</Label>
                <span className="text-xs font-normal text-muted-foreground">Pre-selected country on the checkout form</span>
              </div>
              <div className="basis-2/3">
                <Select
                  value={draft.defaultCheckoutCountry}
                  onValueChange={(defaultCheckoutCountry) => updateDraft({ defaultCheckoutCountry })}
                  indicatorPosition="right"
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {checkoutCountries.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
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

'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input, InputAddon, InputGroup } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Mail } from "lucide-react";
import { useSettingsForm } from "../../settings-form-context";

export function InvoicesReceipts() {
  const { draft, updateDraft } = useSettingsForm();

  return (
    <Card className="bg-accent/70 rounded-md shadow-none h-full flex flex-col">
      <CardContent className="p-0 flex flex-col h-full">
        <h3 className="text-sm font-medium text-foreground py-2.5 ps-2">Invoices & Receipts</h3>
        <div className="bg-background rounded-md m-1 mt-0 border border-input p-5 space-y-5 h-full">
          <div className="flex items-center gap-5">
            <div className="flex flex-col gap-0.5 basis-1/3">
              <Label className="text-2sm font-medium text-foreground">Automatic Invoice Generation</Label>
              <span className="text-xs text-muted-foreground">Create invoices when an order is paid</span>
            </div>
            <div className="flex flex-col gap-1.5 basis-2/3">
              <div className="flex items-center gap-1.5">
                <Switch
                  id="automatic-invoice"
                  checked={draft.automaticInvoice}
                  onCheckedChange={(automaticInvoice) => updateDraft({ automaticInvoice })}
                  size="sm"
                />
                <Label htmlFor="automatic-invoice">{draft.automaticInvoice ? 'Active' : 'Inactive'}</Label>
              </div>
              <span className="text-xs text-muted-foreground font-normal">
                {draft.automaticInvoice
                  ? 'Invoices are generated automatically after payment.'
                  : 'Invoices are created only when requested.'}
              </span>
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-5">
            <div className="flex flex-col gap-0.5 basis-1/3">
              <Label className="text-2sm font-medium text-foreground">No-reply Email Address</Label>
              <span className="text-xs text-muted-foreground">Sender address for receipts and invoices</span>
            </div>
            <div className="basis-2/3">
              <InputGroup>
                <InputAddon mode="icon">
                  <Mail />
                </InputAddon>
                <Input
                  type="email"
                  placeholder="no-reply@mystore.io"
                  value={draft.noReplyEmail ?? ''}
                  onChange={(e) => updateDraft({ noReplyEmail: e.target.value })}
                />
              </InputGroup>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useDepositCustomerAccount } from '@/store-inventory/hooks/use-customer-accounts';
import { formatMoney, parseMoney } from '@/store-inventory/lib/format';
import { DEPOSIT_PAYMENT_METHODS } from '@/store-inventory/lib/payment-methods';
import type { DepositPaymentMethod } from '@/store-inventory/services/customer-accounts';
import type { CustomerListRow } from '@/store-inventory/types';

export function CustomerDepositSheet({
  open,
  onOpenChange,
  customer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: CustomerListRow;
}) {
  const deposit = useDepositCustomerAccount();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<DepositPaymentMethod>('cash');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setAmount('');
    setPaymentMethod('cash');
    setNotes('');
  }, [open, customer?.id]);

  const handleSave = async () => {
    if (!customer) {
      toast.error('Select a customer first');
      return;
    }
    const value = parseMoney(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Enter a deposit amount greater than 0');
      return;
    }
    try {
      await deposit.mutateAsync({
        customerId: customer.id,
        amount: value,
        paymentMethod,
        notes: notes.trim() || undefined,
      });
      toast.success(`Deposited ${formatMoney(value)} to ${customer.customerInfo.title}`);
      onOpenChange(false);
    } catch {
      // Error toast is handled by the mutation.
    }
  };

  const currentBalance = customer?.accountBalance ?? 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:w-[420px] inset-5 start-auto h-auto rounded-lg p-0 [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="border-b border-border p-5">
          <SheetTitle>Deposit to account</SheetTitle>
        </SheetHeader>
        <SheetBody className="p-5 space-y-4">
          <div className="rounded-md bg-accent/50 p-3 text-sm">
            <div className="text-muted-foreground">Customer</div>
            <div className="font-medium text-foreground">{customer?.customerInfo.title || '—'}</div>
            <div className="mt-2 flex justify-between">
              <span className="text-muted-foreground">Current balance</span>
              <span className={currentBalance < 0 ? 'text-destructive font-medium' : 'font-medium'}>
                {formatMoney(currentBalance)}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input
              type="number"
              min={0}
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label>Received via</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as DepositPaymentMethod)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPOSIT_PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional"
            />
          </div>
        </SheetBody>
        <SheetFooter className="border-t border-border p-5">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="mono" onClick={handleSave} disabled={deposit.isPending || !customer}>
            Deposit
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

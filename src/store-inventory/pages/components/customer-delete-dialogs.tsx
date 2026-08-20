'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useCustomerDeleteImpact,
  useHardDeleteCustomer,
  useRestoreCustomer,
} from '@/store-inventory/hooks/use-inventory';
import { mapCustomerError } from '@/store-inventory/lib/customer-errors';
import { formatMoney } from '@/store-inventory/lib/format';

type SoftDeleteTarget = {
  id: string;
  title: string;
  code: string;
  accountBalance?: number;
};

type HardDeleteTarget = SoftDeleteTarget;

export function CustomerSoftDeleteDialog({
  open,
  onOpenChange,
  customer,
  onConfirm,
  confirming = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: SoftDeleteTarget | null;
  onConfirm: () => void;
  confirming?: boolean;
}) {
  const balance = customer?.accountBalance ?? 0;
  const blocked = balance !== 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive customer?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              {blocked ? (
                <p>
                  <strong className="text-foreground">{customer?.title}</strong> has an account
                  balance of <strong className="text-foreground">{formatMoney(balance)}</strong>.
                  Settle the balance (deposit or collect credit) before archiving.
                </p>
              ) : (
                <p>
                  <strong className="text-foreground">{customer?.title}</strong> ({customer?.code})
                  will be archived and hidden from POS and the main customer list. You can restore
                  them later from the Archived tab.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={confirming}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={confirming || !customer || blocked}
            onClick={onConfirm}
          >
            {confirming ? 'Archiving…' : 'Move to archive'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function CustomerHardDeleteDialog({
  open,
  onOpenChange,
  customer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: HardDeleteTarget | null;
}) {
  const [codeConfirm, setCodeConfirm] = useState('');
  const hardDelete = useHardDeleteCustomer();
  const { data: impact, isLoading, isError } = useCustomerDeleteImpact(
    customer?.id,
    open && Boolean(customer?.id),
  );

  useEffect(() => {
    if (!open) setCodeConfirm('');
  }, [open]);

  const codeMatches = Boolean(customer && codeConfirm.trim() === customer.code);
  const canDelete =
    codeMatches &&
    Boolean(impact?.can_hard_delete) &&
    !hardDelete.isPending &&
    !isLoading &&
    !isError;

  const handleConfirm = () => {
    if (!customer || !canDelete) return;
    hardDelete.mutate(customer.id, {
      onSuccess: () => {
        toast.success('Customer permanently deleted');
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(mapCustomerError(error).message);
      },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Permanently delete customer?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                This will permanently wipe <strong className="text-foreground">{customer?.title}</strong>.
                This cannot be undone.
              </p>
              {isLoading && <p>Loading impact…</p>}
              {isError && <p className="text-destructive">Unable to load delete impact.</p>}
              {impact && (
                <ul className="list-disc ps-5 space-y-1">
                  <li>Account balance: {formatMoney(impact.account_balance)}</li>
                  <li>{impact.ledger_count} ledger transactions</li>
                  <li>{impact.pos_sales_count} POS sales</li>
                  <li>{impact.orders_count} orders</li>
                </ul>
              )}
              {impact && !impact.can_hard_delete ? (
                <p className="text-destructive">
                  This customer has history or a non-zero balance and must stay archived.
                </p>
              ) : null}
              <div className="space-y-2 pt-1">
                <Label htmlFor="hard-delete-customer-code">Type the customer code to confirm</Label>
                <Input
                  id="hard-delete-customer-code"
                  value={codeConfirm}
                  onChange={(e) => setCodeConfirm(e.target.value)}
                  placeholder={customer?.code ?? 'Code'}
                  autoComplete="off"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={hardDelete.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={!canDelete} onClick={handleConfirm}>
            {hardDelete.isPending ? 'Deleting…' : 'Delete permanently'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function useCustomerRestoreAction() {
  const restoreCustomer = useRestoreCustomer();
  return {
    restoreCustomer,
    restore: (id: string, onSuccess?: () => void) => {
      restoreCustomer.mutate(id, {
        onSuccess: () => {
          toast.success('Customer restored as Active');
          onSuccess?.();
        },
        onError: (error) => {
          toast.error(mapCustomerError(error).message);
        },
      });
    },
  };
}

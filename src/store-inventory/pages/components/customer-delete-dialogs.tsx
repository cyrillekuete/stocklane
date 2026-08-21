'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useT } from '@/i18n/use-t';
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
  const t = useT();
  const balance = customer?.accountBalance ?? 0;
  const blocked = balance !== 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('Archive customer?')}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              {blocked ? (
                <p>
                  {t(
                    '{title} has an account balance of {amount}. Settle the balance (deposit or collect credit) before archiving.',
                    { title: customer?.title ?? '', amount: formatMoney(balance) },
                  )}
                </p>
              ) : (
                <p>
                  {t(
                    '{title} ({code}) will be archived and hidden from POS and the main customer list. You can restore them later from the Archived tab.',
                    { title: customer?.title ?? '', code: customer?.code ?? '' },
                  )}
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={confirming}>{t('Cancel')}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={confirming || !customer || blocked}
            onClick={onConfirm}
          >
            {confirming ? t('Archiving…') : t('Move to archive')}
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
  const t = useT();
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
        toast.success(t('Customer permanently deleted'));
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(t(mapCustomerError(error).message));
      },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('Permanently delete customer?')}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                {t('This will permanently wipe {title}. This cannot be undone.', {
                  title: customer?.title ?? '',
                })}
              </p>
              {isLoading && <p>{t('Loading impact…')}</p>}
              {isError && <p className="text-destructive">{t('Unable to load delete impact.')}</p>}
              {impact && (
                <ul className="list-disc ps-5 space-y-1">
                  <li>{t('Account balance: {amount}', { amount: formatMoney(impact.account_balance) })}</li>
                  <li>{t('{count} ledger transactions', { count: impact.ledger_count })}</li>
                  <li>{t('{count} POS sales', { count: impact.pos_sales_count })}</li>
                  <li>{t('{count} orders', { count: impact.orders_count })}</li>
                </ul>
              )}
              {impact && !impact.can_hard_delete ? (
                <p className="text-destructive">
                  {t('This customer has history or a non-zero balance and must stay archived.')}
                </p>
              ) : null}
              <div className="space-y-2 pt-1">
                <Label htmlFor="hard-delete-customer-code">{t('Type the customer code to confirm')}</Label>
                <Input
                  id="hard-delete-customer-code"
                  value={codeConfirm}
                  onChange={(e) => setCodeConfirm(e.target.value)}
                  placeholder={customer?.code ?? t('Code')}
                  autoComplete="off"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={hardDelete.isPending}>{t('Cancel')}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={!canDelete} onClick={handleConfirm}>
            {hardDelete.isPending ? t('Deleting…') : t('Delete permanently')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function useCustomerRestoreAction() {
  const restoreCustomer = useRestoreCustomer();
  const t = useT();
  return {
    restoreCustomer,
    restore: (id: string, onSuccess?: () => void) => {
      restoreCustomer.mutate(id, {
        onSuccess: () => {
          toast.success(t('Customer restored as Active'));
          onSuccess?.();
        },
        onError: (error) => {
          toast.error(t(mapCustomerError(error).message));
        },
      });
    },
  };
}

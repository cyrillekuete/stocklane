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
  useHardDeleteProduct,
  useProductDeleteImpact,
  useRestoreProduct,
} from '@/store-inventory/hooks/use-inventory';

type SoftDeleteTarget = {
  id: string;
  title: string;
  sku: string;
};

type HardDeleteTarget = SoftDeleteTarget;

export function ProductSoftDeleteDialog({
  open,
  onOpenChange,
  product,
  onConfirm,
  confirming = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: SoftDeleteTarget | null;
  onConfirm: () => void;
  confirming?: boolean;
}) {
  const t = useT();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('Move product to trash?')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              '{title} ({sku}) will be archived and hidden from catalogs and stock lists. You can restore it later from the Archived tab, or permanently delete it.',
              { title: product?.title ?? '', sku: product?.sku ?? '' },
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={confirming}>{t('Cancel')}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={confirming || !product} onClick={onConfirm}>
            {confirming ? t('Moving…') : t('Move to trash')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ProductHardDeleteDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: HardDeleteTarget | null;
}) {
  const t = useT();
  const [skuConfirm, setSkuConfirm] = useState('');
  const hardDelete = useHardDeleteProduct();
  const { data: impact, isLoading, isError } = useProductDeleteImpact(product?.id, open && Boolean(product?.id));

  useEffect(() => {
    if (!open) setSkuConfirm('');
  }, [open]);

  const skuMatches = Boolean(product && skuConfirm.trim() === product.sku);
  const canDelete =
    skuMatches &&
    Boolean(impact?.can_hard_delete) &&
    !hardDelete.isPending &&
    !isLoading &&
    !isError;

  const handleConfirm = () => {
    if (!product || !canDelete) return;
    hardDelete.mutate(product.id, {
      onSuccess: () => {
        toast.success(t('Product permanently deleted'));
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : t('Unable to permanently delete product'));
      },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('Permanently delete product?')}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                {t(
                  'This will permanently wipe {title} and related inventory records. This cannot be undone.',
                  { title: product?.title ?? '' },
                )}
              </p>
              {isLoading && <p>{t('Loading impact…')}</p>}
              {isError && <p className="text-destructive">{t('Unable to load delete impact.')}</p>}
              {impact && !impact.can_hard_delete ? (
                <p className="text-destructive">
                  {t(
                    'This product still has stock, shipments, sales history, or stock movements. Keep it archived instead of permanently deleting it.',
                  )}
                </p>
              ) : null}
              {impact && (
                <ul className="list-disc ps-5 space-y-1">
                  <li>{t('{count} variants', { count: impact.variants })}</li>
                  <li>{t('{count} option groups', { count: impact.options })}</li>
                  <li>{t('{count} warehouse stock rows', { count: impact.warehouse_stock })}</li>
                  <li>{t('{count} inbound shipments', { count: impact.inbound_shipments })}</li>
                  <li>{t('{count} outbound shipments', { count: impact.outbound_shipments })}</li>
                  <li>{t('{count} order line items', { count: impact.order_items })}</li>
                  <li>{t('{count} POS line items', { count: impact.pos_sale_items })}</li>
                  <li>{t('{count} stock movement ledger rows', { count: impact.stock_movements })}</li>
                </ul>
              )}
              <div className="space-y-2 pt-1">
                <Label htmlFor="hard-delete-sku">{t('Type the SKU to confirm')}</Label>
                <Input
                  id="hard-delete-sku"
                  value={skuConfirm}
                  onChange={(e) => setSkuConfirm(e.target.value)}
                  placeholder={product?.sku ?? t('SKU')}
                  autoComplete="off"
                  disabled={!impact?.can_hard_delete}
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={hardDelete.isPending}>{t('Cancel')}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!canDelete}
            onClick={handleConfirm}
          >
            {hardDelete.isPending ? t('Deleting…') : t('Delete permanently')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function useProductRestoreAction() {
  const restoreProduct = useRestoreProduct();
  const t = useT();
  return {
    restoreProduct,
    restore: (id: string, onSuccess?: () => void) => {
      restoreProduct.mutate(id, {
        onSuccess: () => {
          toast.success(t('Product restored as Draft'));
          onSuccess?.();
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : t('Unable to restore product'));
        },
      });
    },
  };
}

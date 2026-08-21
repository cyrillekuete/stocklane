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
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Move product to trash?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{product?.title}</strong> ({product?.sku}) will be archived and hidden from
            catalogs and stock lists. You can restore it later from the Archived tab, or permanently
            delete it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={confirming}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={confirming || !product} onClick={onConfirm}>
            {confirming ? 'Moving…' : 'Move to trash'}
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
        toast.success('Product permanently deleted');
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : 'Unable to permanently delete product');
      },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Permanently delete product?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                This will permanently wipe <strong className="text-foreground">{product?.title}</strong>{' '}
                and related inventory records. This cannot be undone.
              </p>
              {isLoading && <p>Loading impact…</p>}
              {isError && <p className="text-destructive">Unable to load delete impact.</p>}
              {impact && !impact.can_hard_delete ? (
                <p className="text-destructive">
                  This product still has stock, shipments, sales history, or stock movements. Keep it
                  archived instead of permanently deleting it.
                </p>
              ) : null}
              {impact && (
                <ul className="list-disc ps-5 space-y-1">
                  <li>{impact.variants} variants</li>
                  <li>{impact.options} option groups</li>
                  <li>{impact.warehouse_stock} warehouse stock rows</li>
                  <li>{impact.inbound_shipments} inbound shipments</li>
                  <li>{impact.outbound_shipments} outbound shipments</li>
                  <li>{impact.order_items} order line items</li>
                  <li>{impact.pos_sale_items} POS line items</li>
                  <li>{impact.stock_movements} stock movement ledger rows</li>
                </ul>
              )}
              <div className="space-y-2 pt-1">
                <Label htmlFor="hard-delete-sku">Type the SKU to confirm</Label>
                <Input
                  id="hard-delete-sku"
                  value={skuConfirm}
                  onChange={(e) => setSkuConfirm(e.target.value)}
                  placeholder={product?.sku ?? 'SKU'}
                  autoComplete="off"
                  disabled={!impact?.can_hard_delete}
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={hardDelete.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!canDelete}
            onClick={handleConfirm}
          >
            {hardDelete.isPending ? 'Deleting…' : 'Delete permanently'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function useProductRestoreAction() {
  const restoreProduct = useRestoreProduct();
  return {
    restoreProduct,
    restore: (id: string, onSuccess?: () => void) => {
      restoreProduct.mutate(id, {
        onSuccess: () => {
          toast.success('Product restored as Draft');
          onSuccess?.();
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : 'Unable to restore product');
        },
      });
    },
  };
}

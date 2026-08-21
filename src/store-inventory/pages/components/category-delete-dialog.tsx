'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { mapCategoryError } from '@/store-inventory/lib/category-errors';
import { useT } from '@/i18n/use-t';
import {
  getCategoriesDeleteInfo,
  getCategoryDeleteInfo,
} from '@/store-inventory/services/inventory';
import type { CategoryListRow } from '@/store-inventory/types';

const UNCATEGORIZE_VALUE = '__uncategorize__';

export function CategoryDeleteDialog({
  open,
  onOpenChange,
  category,
  categories,
  categoryIds,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: CategoryListRow | null;
  /** When set, bulk-delete these ids (takes precedence over single category). */
  categoryIds?: string[];
  categories: CategoryListRow[];
  pending?: boolean;
  onConfirm: (reassignToCategoryId: string | null) => Promise<void> | void;
}) {
  const t = useT();
  const bulkIds = useMemo(
    () => [...new Set((categoryIds ?? []).filter(Boolean))],
    [categoryIds],
  );
  const isBulk = bulkIds.length > 1 || (bulkIds.length === 1 && !category);
  const excludeIds = useMemo(() => {
    if (bulkIds.length) return new Set(bulkIds);
    if (category?.id) return new Set([category.id]);
    return new Set<string>();
  }, [bulkIds, category?.id]);

  const [messages, setMessages] = useState<string[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [reassignValue, setReassignValue] = useState(UNCATEGORIZE_VALUE);
  const [loadingInfo, setLoadingInfo] = useState(false);

  const reassignTargets = useMemo(
    () =>
      categories.filter(
        (row) =>
          !excludeIds.has(row.id) && row.status.label.toLowerCase() === 'active',
      ),
    [categories, excludeIds],
  );

  useEffect(() => {
    if (!open) return;
    const targetIds = bulkIds.length ? bulkIds : category?.id ? [category.id] : [];
    if (!targetIds.length) return;

    let cancelled = false;
    setLoadingInfo(true);
    setReassignValue(UNCATEGORIZE_VALUE);
    setMessages([]);
    setProductCount(0);

    const loader =
      targetIds.length === 1
        ? getCategoryDeleteInfo(targetIds[0]).then((info) => ({
            productCount: info.productCount,
            messages: info.messages,
          }))
        : getCategoriesDeleteInfo(targetIds);

    void loader
      .then((info) => {
        if (cancelled) return;
        setProductCount(info.productCount);
        setMessages(info.messages);
      })
      .catch((error) => {
        if (cancelled) return;
        setMessages([mapCategoryError(error).message]);
      })
      .finally(() => {
        if (!cancelled) setLoadingInfo(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, category?.id, bulkIds]);

  const handleConfirm = async () => {
    const reassignToCategoryId =
      reassignValue === UNCATEGORIZE_VALUE ? null : reassignValue;
    await onConfirm(reassignToCategoryId);
  };

  const title = isBulk || bulkIds.length > 1 ? t('Delete categories') : t('Delete category');

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              {loadingInfo ? (
                <p>{t('Checking linked products…')}</p>
              ) : (
                messages.map((message) => <p key={message}>{t(message)}</p>)
              )}
              {productCount > 0 ? (
                <div className="space-y-2 pt-1">
                  <Label>{t('Reassign products to')}</Label>
                  <Select value={reassignValue} onValueChange={setReassignValue}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('Leave Uncategorized')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNCATEGORIZE_VALUE}>{t('Leave Uncategorized')}</SelectItem>
                      {reassignTargets.map((row) => (
                        <SelectItem key={row.id} value={row.id}>
                          {row.productInfo.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t('Cancel')}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(event) => {
              event.preventDefault();
              void handleConfirm();
            }}
            disabled={pending || loadingInfo || (!category?.id && !bulkIds.length)}
          >
            {t('Delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

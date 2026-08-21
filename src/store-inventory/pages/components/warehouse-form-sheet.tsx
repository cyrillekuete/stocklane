'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { useT } from '@/i18n/use-t';
import {
  useActiveWarehouses,
  useCreateWarehouse,
  useDeleteWarehouse,
  useMoveWarehouseStock,
  useUpdateWarehouse,
} from '@/store-inventory/hooks/use-warehouses';
import { mapWarehouseError } from '@/store-inventory/lib/warehouse-errors';
import { getWarehouseDeleteBlockers } from '@/store-inventory/services/warehouses';
import type { WarehouseListRow } from '@/store-inventory/types';

export function WarehouseFormSheet({
  mode,
  open,
  onOpenChange,
  warehouse,
}: {
  mode: 'new' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse?: WarehouseListRow;
}) {
  const t = useT();
  const createWarehouse = useCreateWarehouse();
  const updateWarehouse = useUpdateWarehouse();
  const deleteWarehouse = useDeleteWarehouse();
  const moveStock = useMoveWarehouseStock();
  const { data: activeWarehouses } = useActiveWarehouses();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('Active');
  const [isDefault, setIsDefault] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteSummary, setDeleteSummary] = useState<string[]>([]);
  const [moveTargetId, setMoveTargetId] = useState('');
  const pending =
    createWarehouse.isPending ||
    updateWarehouse.isPending ||
    deleteWarehouse.isPending ||
    moveStock.isPending;

  const moveTargets = useMemo(
    () => (activeWarehouses ?? []).filter((row) => row.id !== warehouse?.id),
    [activeWarehouses, warehouse?.id],
  );

  useEffect(() => {
    if (!open) return;
    setCode(warehouse?.code ?? '');
    setName(warehouse?.name ?? '');
    setAddress(warehouse?.address ?? '');
    setCity(warehouse?.city ?? '');
    setCountry(warehouse?.country ?? '');
    setPhone(warehouse?.phone ?? '');
    setStatus(warehouse?.status.label ?? 'Active');
    setIsDefault(Boolean(warehouse?.isDefault));
    setMoveTargetId('');
    setDeleteSummary([]);
  }, [open, warehouse]);

  const handleSave = async () => {
    if (!code.trim() || !name.trim()) {
      toast.error(t('Code and name are required'));
      return;
    }
    if (isDefault && status !== 'Active') {
      toast.error(t('Default warehouse must be Active'));
      return;
    }
    try {
      if (mode === 'new') {
        await createWarehouse.mutateAsync({
          code,
          name,
          address,
          city,
          country,
          phone,
          status,
          isDefault,
        });
        toast.success(t('Warehouse created'));
      } else if (warehouse) {
        await updateWarehouse.mutateAsync({
          id: warehouse.id,
          input: { code, name, address, city, country, phone, status, isDefault },
        });
        toast.success(t('Warehouse updated'));
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(t(mapWarehouseError(error).message));
    }
  };

  const openDeleteConfirm = async () => {
    if (!warehouse) return;
    try {
      const blockers = await getWarehouseDeleteBlockers(warehouse.id);
      setDeleteSummary(
        blockers.messages.length
          ? blockers.messages
          : [t('Delete {name}? This cannot be undone.', { name: warehouse.name })],
      );
      if (blockers.hasStock && moveTargets[0]) {
        setMoveTargetId(moveTargets[0].id);
      }
      setConfirmDeleteOpen(true);
    } catch (error) {
      toast.error(t(mapWarehouseError(error).message));
    }
  };

  const handleMoveStock = async () => {
    if (!warehouse || !moveTargetId) {
      toast.error(t('Select a destination warehouse'));
      return;
    }
    try {
      const moved = await moveStock.mutateAsync({
        fromWarehouseId: warehouse.id,
        toWarehouseId: moveTargetId,
      });
      toast.success(t('Moved {count} units to the selected warehouse', { count: moved }));
      const blockers = await getWarehouseDeleteBlockers(warehouse.id);
      setDeleteSummary(
        blockers.messages.length
          ? blockers.messages
          : [t('Stock moved. You can delete {name} now.', { name: warehouse.name })],
      );
    } catch (error) {
      toast.error(t(mapWarehouseError(error).message));
    }
  };

  const handleConfirmDelete = async () => {
    if (!warehouse) return;
    try {
      const blockers = await getWarehouseDeleteBlockers(warehouse.id);
      if (blockers.messages.length) {
        setDeleteSummary(blockers.messages);
        toast.error(t(blockers.messages[0]));
        return;
      }
      await deleteWarehouse.mutateAsync(warehouse.id);
      toast.success(t('Warehouse deleted'));
      setConfirmDeleteOpen(false);
      onOpenChange(false);
    } catch (error) {
      toast.error(mapWarehouseError(error).message);
    }
  };

  const defaultLocked = mode === 'edit' && Boolean(warehouse?.isDefault);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:w-[440px] inset-5 start-auto h-auto rounded-lg p-0 [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
          <SheetHeader className="border-b border-border p-5">
            <SheetTitle>{mode === 'new' ? t('Add Warehouse') : t('Edit Warehouse')}</SheetTitle>
          </SheetHeader>
          <SheetBody className="p-0">
            <ScrollArea className="h-[calc(100vh-10.5rem)] px-5">
              <div className="space-y-4 py-5">
                <div className="space-y-2">
                  <Label htmlFor="wh-code">{t('Code')}</Label>
                  <Input id="wh-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="MAIN" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wh-name">{t('Name')}</Label>
                  <Input id="wh-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Main Warehouse')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wh-address">{t('Address')}</Label>
                  <Input id="wh-address" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="wh-city">{t('City')}</Label>
                    <Input id="wh-city" value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wh-country">{t('Country')}</Label>
                    <Input id="wh-country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="FR" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wh-phone">{t('Phone')}</Label>
                  <Input id="wh-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t('Status')}</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">{t('Active')}</SelectItem>
                      <SelectItem value="Inactive">{t('Inactive')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={isDefault}
                    disabled={defaultLocked && isDefault}
                    onCheckedChange={(checked) => {
                      if (defaultLocked && !checked) {
                        toast.error(t('Set another warehouse as default before unchecking this one'));
                        return;
                      }
                      setIsDefault(Boolean(checked));
                      if (checked) setStatus('Active');
                    }}
                  />
                  {t('Default warehouse')}
                </label>
                {mode === 'edit' && warehouse && warehouse.onHand > 0 && moveTargets.length > 0 ? (
                  <div className="space-y-3 rounded-md border border-border p-3">
                    <div className="text-sm font-medium text-foreground">{t('Move stock')}</div>
                    <p className="text-xs text-muted-foreground">
                      {t('{count} on-hand units must be moved before this warehouse can be deleted.', { count: warehouse.onHand })}
                    </p>
                    <Select value={moveTargetId} onValueChange={setMoveTargetId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('Destination warehouse')} />
                      </SelectTrigger>
                      <SelectContent>
                        {moveTargets.map((row) => (
                          <SelectItem key={row.id} value={row.id}>
                            {row.name} ({row.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={handleMoveStock} disabled={pending || !moveTargetId}>
                      {t('Move all stock')}
                    </Button>
                  </div>
                ) : null}
              </div>
            </ScrollArea>
          </SheetBody>
          <SheetFooter className="border-t border-border p-5 flex-row justify-between">
            {mode === 'edit' ? (
              <Button variant="destructive" onClick={openDeleteConfirm} disabled={pending}>
                {t('Delete')}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('Cancel')}
              </Button>
              <Button variant="mono" onClick={handleSave} disabled={pending}>
                {mode === 'new' ? t('Create') : t('Save')}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete warehouse')}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                {deleteSummary.map((message) => (
                  <p key={message}>{t(message)}</p>
                ))}
                {warehouse && warehouse.onHand > 0 && moveTargets.length > 0 ? (
                  <div className="space-y-2 pt-2">
                    <Label>{t('Move all stock to')}</Label>
                    <Select value={moveTargetId} onValueChange={setMoveTargetId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('Destination warehouse')} />
                      </SelectTrigger>
                      <SelectContent>
                        {moveTargets.map((row) => (
                          <SelectItem key={row.id} value={row.id}>
                            {row.name} ({row.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={handleMoveStock} disabled={pending || !moveTargetId}>
                      {t('Move all stock')}
                    </Button>
                  </div>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmDelete} disabled={pending}>
              {t('Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
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
import {
  useCreateWarehouse,
  useDeleteWarehouse,
  useUpdateWarehouse,
} from '@/store-inventory/hooks/use-warehouses';
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
  const createWarehouse = useCreateWarehouse();
  const updateWarehouse = useUpdateWarehouse();
  const deleteWarehouse = useDeleteWarehouse();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('Active');
  const [isDefault, setIsDefault] = useState(false);
  const pending = createWarehouse.isPending || updateWarehouse.isPending || deleteWarehouse.isPending;

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
  }, [open, warehouse]);

  const handleSave = async () => {
    if (!code.trim() || !name.trim()) {
      toast.error('Code and name are required');
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
        toast.success('Warehouse created');
      } else if (warehouse) {
        await updateWarehouse.mutateAsync({
          id: warehouse.id,
          input: { code, name, address, city, country, phone, status, isDefault },
        });
        toast.success('Warehouse updated');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save warehouse');
    }
  };

  const handleDelete = async () => {
    if (!warehouse) return;
    try {
      await deleteWarehouse.mutateAsync(warehouse.id);
      toast.success('Warehouse deleted');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete warehouse');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:w-[440px] inset-5 start-auto h-auto rounded-lg p-0 [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="border-b border-border p-5">
          <SheetTitle>{mode === 'new' ? 'Add Warehouse' : 'Edit Warehouse'}</SheetTitle>
        </SheetHeader>
        <SheetBody className="p-0">
          <ScrollArea className="h-[calc(100vh-10.5rem)] px-5">
            <div className="space-y-4 py-5">
              <div className="space-y-2">
                <Label htmlFor="wh-code">Code</Label>
                <Input id="wh-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="MAIN" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wh-name">Name</Label>
                <Input id="wh-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Main Warehouse" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wh-address">Address</Label>
                <Input id="wh-address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="wh-city">City</Label>
                  <Input id="wh-city" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wh-country">Country</Label>
                  <Input id="wh-country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="FR" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wh-phone">Phone</Label>
                <Input id="wh-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={isDefault} onCheckedChange={(checked) => setIsDefault(Boolean(checked))} />
                Default warehouse
              </label>
            </div>
          </ScrollArea>
        </SheetBody>
        <SheetFooter className="border-t border-border p-5 flex-row justify-between">
          {mode === 'edit' ? (
            <Button variant="destructive" onClick={handleDelete} disabled={pending}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="mono" onClick={handleSave} disabled={pending}>
              {mode === 'new' ? 'Create' : 'Save'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

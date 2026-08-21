'use client';

import { useState } from 'react';
import { format } from 'date-fns';
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
import { useT } from '@/i18n/use-t';
import { useCreateOutboundShipment, useProducts } from '@/store-inventory/hooks/use-inventory';
import { useActiveWarehouses } from '@/store-inventory/hooks/use-warehouses';

export function ShipStockSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const { data: products } = useProducts();
  const { data: warehouses } = useActiveWarehouses();
  const createOutbound = useCreateOutboundShipment();
  const defaultWarehouse = warehouses?.find((row) => row.isDefault) ?? warehouses?.[0];
  const [productId, setProductId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [qty, setQty] = useState('1');
  const [orderRef, setOrderRef] = useState('');

  const selectedWarehouse = warehouseId || defaultWarehouse?.id || '';

  const handleSave = async () => {
    const quantity = Number(qty);
    if (!productId || !selectedWarehouse || !Number.isFinite(quantity) || quantity < 1) {
      toast.error(t('Product, warehouse, and quantity are required'));
      return;
    }
    try {
      await createOutbound.mutateAsync({
        productId,
        warehouseId: selectedWarehouse,
        qty: quantity,
        orderRef: orderRef.trim() || undefined,
        expectedDelivery: format(new Date(), 'd MMM, yyyy'),
        status: 'Allocated',
      });
      toast.success(t('Stock shipped from warehouse'));
      setProductId('');
      setQty('1');
      setOrderRef('');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? t(error.message) : t('Unable to ship stock'));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:w-[420px] inset-5 start-auto h-auto rounded-lg p-0 [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="border-b border-border p-5">
          <SheetTitle>{t('Ship Stock')}</SheetTitle>
        </SheetHeader>
        <SheetBody className="p-5 space-y-4">
          <div className="space-y-2">
            <Label>{t('Product')}</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder={t('Select product')} />
              </SelectTrigger>
              <SelectContent>
                {(products ?? []).map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.productInfo.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('Warehouse')}</Label>
            <Select value={selectedWarehouse} onValueChange={setWarehouseId}>
              <SelectTrigger>
                <SelectValue placeholder={t('Select warehouse')} />
              </SelectTrigger>
              <SelectContent>
                {(warehouses ?? []).map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} ({warehouse.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('Quantity')}</Label>
            <Input
              type="number"
              min={1}
              value={qty}
              onChange={(event) => setQty(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('Order reference')}</Label>
            <Input
              value={orderRef}
              onChange={(event) => setOrderRef(event.target.value)}
              placeholder={t('Optional')}
            />
          </div>
        </SheetBody>
        <SheetFooter className="border-t border-border p-5">
          <Button variant="mono" onClick={handleSave} disabled={createOutbound.isPending}>
            {t('Ship Stock')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

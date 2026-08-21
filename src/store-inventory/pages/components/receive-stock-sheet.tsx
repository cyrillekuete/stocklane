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
import { useCreateInboundShipment, useProducts } from '@/store-inventory/hooks/use-inventory';
import { useActiveWarehouses } from '@/store-inventory/hooks/use-warehouses';
import { parseMoney } from '@/store-inventory/lib/format';

export function ReceiveStockSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const { data: products } = useProducts();
  const { data: warehouses } = useActiveWarehouses();
  const createInbound = useCreateInboundShipment();
  const defaultWarehouse = warehouses?.find((row) => row.isDefault) ?? warehouses?.[0];
  const [productId, setProductId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [qty, setQty] = useState('1');

  const selectedWarehouse = warehouseId || defaultWarehouse?.id || '';

  const handleSave = async () => {
    const quantity = Number(qty);
    if (!(warehouses ?? []).length) {
      toast.error(t('Activate a warehouse first'));
      return;
    }
    if (!productId || !selectedWarehouse || !Number.isFinite(quantity) || quantity < 1) {
      toast.error(t('Product, warehouse, and quantity are required'));
      return;
    }
    const product = products?.find((row) => row.id === productId);
    try {
      await createInbound.mutateAsync({
        productId,
        warehouseId: selectedWarehouse,
        qty: quantity,
        stockValue: parseMoney(product?.price) * quantity,
        orderDate: format(new Date(), 'd MMM, yyyy'),
      });
      toast.success(t('Stock received into warehouse'));
      setProductId('');
      setQty('1');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? t(error.message) : t('Unable to receive stock'));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:w-[420px] inset-5 start-auto h-auto rounded-lg p-0 [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="border-b border-border p-5">
          <SheetTitle>{t('Receive Stock')}</SheetTitle>
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
                    {product.productInfo.title} ({product.productInfo.label})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('Warehouse')}</Label>
            <Select value={selectedWarehouse} onValueChange={setWarehouseId} disabled={!(warehouses ?? []).length}>
              <SelectTrigger>
                <SelectValue placeholder={(warehouses ?? []).length ? t('Select warehouse') : t('Activate a warehouse first')} />
              </SelectTrigger>
              <SelectContent>
                {(warehouses ?? []).map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('Quantity')}</Label>
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
        </SheetBody>
        <SheetFooter className="border-t border-border p-5">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('Cancel')}
          </Button>
          <Button variant="mono" onClick={handleSave} disabled={createInbound.isPending || !(warehouses ?? []).length}>
            {t('Receive')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

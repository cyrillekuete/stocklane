'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { PlusIcon, Trash2 } from 'lucide-react';
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
import {
  InboundShipmentBatchError,
  type InboundShipmentLineInput,
} from '@/store-inventory/services/inventory';
import { useCreateInboundShipmentsBatch, useProducts } from '@/store-inventory/hooks/use-inventory';
import { useStoreSettings } from '@/store-inventory/hooks/use-settings';
import { useActiveWarehouses } from '@/store-inventory/hooks/use-warehouses';
import { formatMoney, parseMoney } from '@/store-inventory/lib/format';
import { generateReceiveStockPdf } from '@/store-inventory/lib/receive-stock-pdf';

type DraftLine = {
  key: string;
  productId: string;
  warehouseId: string;
  qty: string;
  unitValue: string;
};

function newLine(warehouseId = ''): DraftLine {
  return {
    key: crypto.randomUUID(),
    productId: '',
    warehouseId,
    qty: '1',
    unitValue: '',
  };
}

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
  const { data: settings } = useStoreSettings();
  const createInboundBatch = useCreateInboundShipmentsBatch();
  const defaultWarehouse = warehouses?.find((row) => row.isDefault) ?? warehouses?.[0];
  const [lines, setLines] = useState<DraftLine[]>([newLine()]);

  useEffect(() => {
    if (!open) return;
    setLines([newLine(defaultWarehouse?.id ?? '')]);
  }, [open, defaultWarehouse?.id]);

  const lineTotals = useMemo(() => {
    return lines.map((line) => {
      const qty = Number(line.qty);
      const unitValue = parseMoney(line.unitValue);
      if (!Number.isFinite(qty) || qty < 1 || unitValue < 0) return 0;
      return unitValue * Math.trunc(qty);
    });
  }, [lines]);

  const grandTotal = lineTotals.reduce((sum, value) => sum + value, 0);

  const updateLine = (key: string, patch: Partial<DraftLine>) => {
    setLines((current) =>
      current.map((line) => {
        if (line.key !== key) return line;
        const next = { ...line, ...patch };
        if (patch.productId !== undefined) {
          const product = products?.find((row) => row.id === patch.productId);
          if (product && (!line.unitValue || patch.productId !== line.productId)) {
            next.unitValue = String(parseMoney(product.price) || 0);
          }
        }
        return next;
      }),
    );
  };

  const handleSave = async () => {
    if (!(warehouses ?? []).length) {
      toast.error(t('Activate a warehouse first'));
      return;
    }
    if (!lines.length) {
      toast.error(t('Add at least one stock line'));
      return;
    }

    const payload: InboundShipmentLineInput[] = [];
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]!;
      const product = products?.find((row) => row.id === line.productId);
      const warehouse =
        warehouses?.find((row) => row.id === line.warehouseId) ??
        (line.warehouseId ? undefined : defaultWarehouse);
      const qty = Number(line.qty);
      const unitValue = parseMoney(line.unitValue);
      if (
        !product ||
        !warehouse ||
        !Number.isFinite(qty) ||
        qty < 1 ||
        !Number.isFinite(unitValue) ||
        unitValue < 0
      ) {
        toast.error(t('Product, warehouse, quantity, and unit value are required on every line'));
        return;
      }
      payload.push({
        productId: product.id,
        warehouseId: warehouse.id,
        qty: Math.trunc(qty),
        unitValue,
        productName: product.productInfo.title,
        productSku: product.productInfo.label,
        warehouseName: warehouse.name,
        orderDate: format(new Date(), 'd MMM, yyyy'),
      });
    }

    try {
      const batch = await createInboundBatch.mutateAsync(payload);
      try {
        generateReceiveStockPdf(batch, {
          storeName: settings?.storeName ?? t('Store'),
          labels: {
            title: t('Stock entry receipt'),
            product: t('Product'),
            warehouse: t('Warehouse'),
            qty: t('Quantity'),
            unitValue: t('Unit value'),
            lineValue: t('Line value'),
            totalQty: t('Total quantity'),
            totalValue: t('Total value'),
            date: t('Date'),
          },
        });
      } catch {
        toast.error(t('Stock received, but the PDF could not be downloaded'));
      }
      toast.success(
        t('{count} stock lines received into warehouses', { count: batch.lines.length }),
      );
      onOpenChange(false);
    } catch (error) {
      if (error instanceof InboundShipmentBatchError && error.succeeded > 0) {
        try {
          generateReceiveStockPdf(
            {
              lines: error.results,
              totalQty: error.results.reduce((sum, row) => sum + row.qty, 0),
              totalValue: error.results.reduce((sum, row) => sum + row.lineTotal, 0),
              orderDate: error.results[0]?.orderDate ?? format(new Date(), 'd MMM, yyyy'),
            },
            {
              storeName: settings?.storeName ?? t('Store'),
              labels: {
                title: t('Stock entry receipt'),
                product: t('Product'),
                warehouse: t('Warehouse'),
                qty: t('Quantity'),
                unitValue: t('Unit value'),
                lineValue: t('Line value'),
                totalQty: t('Total quantity'),
                totalValue: t('Total value'),
                date: t('Date'),
              },
            },
          );
        } catch {
          // ignore PDF errors on partial success; message below is primary
        }
      }
      toast.error(error instanceof Error ? t(error.message) : t('Unable to receive stock'));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:w-[720px] sm:max-w-[calc(100vw-2.5rem)] inset-5 start-auto h-auto rounded-lg p-0 [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="border-b border-border p-5">
          <SheetTitle>{t('Receive Stock')}</SheetTitle>
        </SheetHeader>
        <SheetBody className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <p className="text-sm text-muted-foreground">
            {t('Add quantities to warehouses without overwriting existing stock. You can enter multiple products across different warehouses at once.')}
          </p>
          <div className="space-y-3">
            {lines.map((line, index) => (
              <div
                key={line.key}
                className="rounded-lg border border-border p-3 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t('Line {number}', { number: index + 1 })}
                  </span>
                  {lines.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-destructive"
                      onClick={() => setLines((current) => current.filter((row) => row.key !== line.key))}
                    >
                      <Trash2 className="size-4" />
                      {t('Remove')}
                    </Button>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>{t('Product')}</Label>
                    <Select
                      value={line.productId}
                      onValueChange={(value) => updateLine(line.key, { productId: value })}
                    >
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
                    <Select
                      value={line.warehouseId || defaultWarehouse?.id || ''}
                      onValueChange={(value) => updateLine(line.key, { warehouseId: value })}
                      disabled={!(warehouses ?? []).length}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            (warehouses ?? []).length
                              ? t('Select warehouse')
                              : t('Activate a warehouse first')
                          }
                        />
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
                    <Input
                      type="number"
                      min={1}
                      value={line.qty}
                      onChange={(e) => updateLine(line.key, { qty: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('Unit value')}</Label>
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      value={line.unitValue}
                      onChange={(e) => updateLine(line.key, { unitValue: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('Line value')}</Label>
                    <div className="flex h-9 items-center rounded-md border border-border px-3 text-sm">
                      {formatMoney(lineTotals[index] ?? 0)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setLines((current) => [...current, newLine(defaultWarehouse?.id ?? '')])
              }
            >
              <PlusIcon />
              {t('Add line')}
            </Button>
            <div className="text-sm font-medium">
              {t('Total value')}: {formatMoney(grandTotal)}
            </div>
          </div>
        </SheetBody>
        <SheetFooter className="border-t border-border p-5">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('Cancel')}
          </Button>
          <Button
            variant="mono"
            onClick={handleSave}
            disabled={createInboundBatch.isPending || !(warehouses ?? []).length}
          >
            {t('Receive')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

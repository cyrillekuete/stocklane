'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { PlusIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { parseMoney } from '@/store-inventory/lib/format';
import { generateReceiveStockPdf } from '@/store-inventory/lib/receive-stock-pdf';
import type { ProductListRow } from '@/store-inventory/types';

type DraftProductLine = {
  key: string;
  productId: string;
  qty: string;
};

type WarehouseGroup = {
  key: string;
  warehouseId: string;
  lines: DraftProductLine[];
};

function newGroup(warehouseId = ''): WarehouseGroup {
  return {
    key: crypto.randomUUID(),
    warehouseId,
    lines: [],
  };
}

function newProductLine(productId: string): DraftProductLine {
  return {
    key: crypto.randomUUID(),
    productId,
    qty: '1',
  };
}

function ProductSearchAdd({
  products,
  excludeIds,
  onAdd,
}: {
  products: ProductListRow[];
  excludeIds: Set<string>;
  onAdd: (productId: string) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const available = products.filter((product) => !excludeIds.has(product.id));

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start"
          disabled={!available.length}
        >
          <PlusIcon />
          {available.length ? t('Search products') : t('All products already added')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-[60] w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={t('Search products')} />
          <CommandList>
            <CommandEmpty>{t('No products found.')}</CommandEmpty>
            <CommandGroup>
              {available.map((product) => (
                <CommandItem
                  key={product.id}
                  value={`${product.productInfo.title} ${product.productInfo.label}`}
                  onSelect={() => {
                    onAdd(product.id);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{product.productInfo.title}</span>
                  <span className="ms-auto shrink-0 text-xs text-muted-foreground">
                    {product.productInfo.label}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
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
  const [groups, setGroups] = useState<WarehouseGroup[]>([newGroup()]);

  const catalogProducts = useMemo(
    () => (products ?? []).filter((row) => !row.deletedAt),
    [products],
  );

  useEffect(() => {
    if (!open) return;
    setGroups([newGroup(defaultWarehouse?.id ?? '')]);
  }, [open, defaultWarehouse?.id]);

  const usedWarehouseIds = useMemo(() => {
    return new Set(
      groups
        .map((group) => group.warehouseId || defaultWarehouse?.id || '')
        .filter(Boolean),
    );
  }, [groups, defaultWarehouse?.id]);

  const totalQty = useMemo(() => {
    return groups.reduce((sum, group) => {
      return (
        sum +
        group.lines.reduce((lineSum, line) => {
          const qty = Number(line.qty);
          if (!Number.isFinite(qty) || qty < 1) return lineSum;
          return lineSum + Math.trunc(qty);
        }, 0)
      );
    }, 0);
  }, [groups]);

  const updateGroup = (key: string, patch: Partial<Pick<WarehouseGroup, 'warehouseId'>>) => {
    setGroups((current) =>
      current.map((group) => (group.key === key ? { ...group, ...patch } : group)),
    );
  };

  const updateLine = (groupKey: string, lineKey: string, qty: string) => {
    setGroups((current) =>
      current.map((group) => {
        if (group.key !== groupKey) return group;
        return {
          ...group,
          lines: group.lines.map((line) => (line.key === lineKey ? { ...line, qty } : line)),
        };
      }),
    );
  };

  const addProduct = (groupKey: string, productId: string) => {
    setGroups((current) =>
      current.map((group) => {
        if (group.key !== groupKey) return group;
        if (group.lines.some((line) => line.productId === productId)) return group;
        return { ...group, lines: [...group.lines, newProductLine(productId)] };
      }),
    );
  };

  const removeLine = (groupKey: string, lineKey: string) => {
    setGroups((current) =>
      current.map((group) => {
        if (group.key !== groupKey) return group;
        return { ...group, lines: group.lines.filter((line) => line.key !== lineKey) };
      }),
    );
  };

  const addWarehouseGroup = () => {
    const nextWarehouse = (warehouses ?? []).find((warehouse) => !usedWarehouseIds.has(warehouse.id));
    if (!nextWarehouse) return;
    setGroups((current) => [...current, newGroup(nextWarehouse.id)]);
  };

  const handleSave = async () => {
    if (!(warehouses ?? []).length) {
      toast.error(t('Activate a warehouse first'));
      return;
    }
    if (!groups.length) {
      toast.error(t('Add at least one stock line'));
      return;
    }

    const payload: InboundShipmentLineInput[] = [];
    const orderDate = format(new Date(), 'd MMM, yyyy');

    for (const group of groups) {
      const warehouseId = group.warehouseId || defaultWarehouse?.id || '';
      const warehouse = warehouses?.find((row) => row.id === warehouseId);
      if (!warehouse) {
        toast.error(t('Select a warehouse for every group'));
        return;
      }
      if (!group.lines.length) {
        toast.error(t('Add at least one product to each warehouse'));
        return;
      }

      for (const line of group.lines) {
        const product = catalogProducts.find((row) => row.id === line.productId);
        const qty = Number(line.qty);
        if (!product || !Number.isFinite(qty) || qty < 1) {
          toast.error(t('Product and quantity are required on every line'));
          return;
        }
        payload.push({
          productId: product.id,
          warehouseId: warehouse.id,
          qty: Math.trunc(qty),
          unitValue: parseMoney(product.price),
          productName: product.productInfo.title,
          productSku: product.productInfo.label,
          warehouseName: warehouse.name,
          orderDate,
        });
      }
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
              orderDate: error.results[0]?.orderDate ?? orderDate,
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

  const canAddWarehouse =
    (warehouses ?? []).length > groups.length &&
    (warehouses ?? []).some((warehouse) => !usedWarehouseIds.has(warehouse.id));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:w-[720px] sm:max-w-[calc(100vw-2.5rem)] inset-5 start-auto h-auto rounded-lg p-0 [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="border-b border-border p-5">
          <SheetTitle>{t('Receive Stock')}</SheetTitle>
        </SheetHeader>
        <SheetBody className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <p className="text-sm text-muted-foreground">
            {t(
              'Select a warehouse, search and add products with quantities, then add another warehouse if needed. Existing stock is increased, not overwritten.',
            )}
          </p>
          <div className="space-y-4">
            {groups.map((group, index) => {
              const selectedIds = new Set(group.lines.map((line) => line.productId));
              return (
                <div key={group.key} className="rounded-lg border border-border p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t('Warehouse {number}', { number: index + 1 })}
                    </span>
                    {groups.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-destructive"
                        onClick={() =>
                          setGroups((current) => current.filter((row) => row.key !== group.key))
                        }
                      >
                        <Trash2 className="size-4" />
                        {t('Remove warehouse')}
                      </Button>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label>{t('Warehouse')}</Label>
                    <Select
                      value={group.warehouseId || defaultWarehouse?.id || ''}
                      onValueChange={(value) => updateGroup(group.key, { warehouseId: value })}
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
                          <SelectItem
                            key={warehouse.id}
                            value={warehouse.id}
                            disabled={
                              warehouse.id !== group.warehouseId && usedWarehouseIds.has(warehouse.id)
                            }
                          >
                            {warehouse.name}
                            {warehouse.isDefault ? ` (${t('Default')})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {group.lines.length ? (
                    <div className="space-y-2">
                      <Label>{t('Products')}</Label>
                      <div className="space-y-2">
                        {group.lines.map((line) => {
                          const product = catalogProducts.find((row) => row.id === line.productId);
                          return (
                            <div key={line.key} className="flex items-center gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium">
                                  {product?.productInfo.title ?? t('Unknown product')}
                                </div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {product?.productInfo.label}
                                </div>
                              </div>
                              <Input
                                className="w-24"
                                type="number"
                                min={1}
                                aria-label={t('Quantity')}
                                value={line.qty}
                                onChange={(event) =>
                                  updateLine(group.key, line.key, event.target.value)
                                }
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeLine(group.key, line.key)}
                              >
                                <Trash2 className="size-4" />
                                <span className="sr-only">{t('Remove')}</span>
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  {catalogProducts.length ? (
                    <ProductSearchAdd
                      products={catalogProducts}
                      excludeIds={selectedIds}
                      onAdd={(productId) => addProduct(group.key, productId)}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('Create products first')}</p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={addWarehouseGroup}
              disabled={!canAddWarehouse}
            >
              <PlusIcon />
              {t('Add warehouse')}
            </Button>
            <div className="text-sm font-medium">
              {t('Total quantity')}: {totalQty}
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

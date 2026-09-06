'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { useQueries } from '@tanstack/react-query';
import { PlusIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useT } from '@/i18n/use-t';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  StockEntryBatchError,
  type InboundShipmentBatchResult,
  type StockEntryBatchResult,
  type StockEntryLineInput,
} from '@/store-inventory/services/inventory';
import { fetchWarehouseStock } from '@/store-inventory/services/warehouses';
import { useApplyStockEntries, useProducts } from '@/store-inventory/hooks/use-inventory';
import { useStoreSettings } from '@/store-inventory/hooks/use-settings';
import { useActiveWarehouses } from '@/store-inventory/hooks/use-warehouses';
import { parseMoney } from '@/store-inventory/lib/format';
import { inventoryKeys } from '@/store-inventory/lib/query-keys';
import { generateReceiveStockPdf } from '@/store-inventory/lib/receive-stock-pdf';
import {
  defaultStockEntryQty,
  isStockEntryType,
  parseStockEntryQty,
  stockEntryHelpMessage,
  stockEntrySubmitLabel,
  stockEntrySuccessMessage,
  type StockEntryLocationState,
  type StockEntryType,
} from '@/store-inventory/lib/stock-entry';
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

function newProductLine(productId: string, type: StockEntryType): DraftProductLine {
  return {
    key: crypto.randomUUID(),
    productId,
    qty: defaultStockEntryQty(type),
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
      <PopoverContent className="z-50 w-[var(--radix-popover-trigger-width)] p-0" align="start">
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

function receivePdfLabels(t: (id: string) => string) {
  return {
    title: t('Stock entry receipt'),
    product: t('Product'),
    warehouse: t('Warehouse'),
    qty: t('Quantity'),
    unitValue: t('Unit value'),
    lineValue: t('Line value'),
    totalQty: t('Total quantity'),
    totalValue: t('Total value'),
    date: t('Date'),
  };
}

function toReceivePdfBatch(batch: Pick<StockEntryBatchResult, 'lines' | 'totalQty' | 'totalValue' | 'orderDate'>): InboundShipmentBatchResult {
  return {
    lines: batch.lines.map((line) => ({
      shipmentId: line.shipmentId ?? '',
      productId: line.productId,
      productName: line.productName,
      productSku: line.productSku,
      warehouseId: line.warehouseId,
      warehouseName: line.warehouseName,
      qty: line.qty,
      unitValue: line.unitValue,
      lineTotal: line.lineTotal,
      orderDate: line.orderDate,
    })),
    totalQty: batch.totalQty,
    totalValue: batch.totalValue,
    orderDate: batch.orderDate,
  };
}

export function StockEntryForm() {
  const t = useT();
  const { data: products } = useProducts();
  const { data: warehouses } = useActiveWarehouses();
  const { data: settings } = useStoreSettings();
  const applyEntries = useApplyStockEntries();
  const location = useLocation();
  const prefill = (location.state ?? null) as StockEntryLocationState | null;
  const prefillKey = JSON.stringify({
    type: prefill?.type ?? null,
    warehouseId: prefill?.warehouseId ?? null,
    lines: prefill?.lines ?? [],
  });
  const defaultWarehouse = warehouses?.find((row) => row.isDefault) ?? warehouses?.[0];
  const [entryType, setEntryType] = useState<StockEntryType>(
    prefill?.type && isStockEntryType(prefill.type) ? prefill.type : 'purchased',
  );
  const [groups, setGroups] = useState<WarehouseGroup[]>([newGroup()]);

  const catalogProducts = useMemo(
    () => (products ?? []).filter((row) => !row.deletedAt),
    [products],
  );

  useEffect(() => {
    const warehouseId = prefill?.warehouseId || defaultWarehouse?.id || '';
    const lines = (prefill?.lines ?? []).map((line) => ({
      key: crypto.randomUUID(),
      productId: line.productId,
      qty: String(Math.max(Math.trunc(line.qty) || 1, 1)),
    }));
    setGroups([
      {
        key: crypto.randomUUID(),
        warehouseId,
        lines,
      },
    ]);
    if (prefill?.type && isStockEntryType(prefill.type)) {
      setEntryType(prefill.type);
    }
  }, [defaultWarehouse?.id, prefillKey]);

  const usedWarehouseIds = useMemo(() => {
    return new Set(
      groups
        .map((group) => group.warehouseId || defaultWarehouse?.id || '')
        .filter(Boolean),
    );
  }, [groups, defaultWarehouse?.id]);

  const selectedWarehouseIds = useMemo(
    () =>
      [...usedWarehouseIds].filter(
        (id, index, all) => Boolean(id) && all.indexOf(id) === index,
      ),
    [usedWarehouseIds],
  );

  const stockQueries = useQueries({
    queries: selectedWarehouseIds.map((warehouseId) => ({
      queryKey: inventoryKeys.warehouseStock(warehouseId),
      queryFn: () => fetchWarehouseStock(warehouseId),
      enabled: isSupabaseConfigured && Boolean(warehouseId),
    })),
  });

  const stockByWarehouse = useMemo(() => {
    const map = new Map<string, Map<string, { qty: number; reserved: number }>>();
    selectedWarehouseIds.forEach((warehouseId, index) => {
      const rows = stockQueries[index]?.data ?? [];
      map.set(
        warehouseId,
        new Map(rows.map((row) => [row.productId, { qty: row.qty, reserved: row.reserved }])),
      );
    });
    return map;
  }, [selectedWarehouseIds, stockQueries]);

  const totalQty = useMemo(() => {
    return groups.reduce((sum, group) => {
      return (
        sum +
        group.lines.reduce((lineSum, line) => {
          const qty = parseStockEntryQty(entryType, line.qty);
          return qty === null ? lineSum : lineSum + qty;
        }, 0)
      );
    }, 0);
  }, [groups, entryType]);

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
        return { ...group, lines: [...group.lines, newProductLine(productId, entryType)] };
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

    const payload: StockEntryLineInput[] = [];
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
        const qty = parseStockEntryQty(entryType, line.qty);
        if (!product || qty === null) {
          toast.error(
            entryType === 'adjustment'
              ? t('Product and a non-zero quantity are required on every line')
              : t('Product and quantity are required on every line'),
          );
          return;
        }
        payload.push({
          productId: product.id,
          warehouseId: warehouse.id,
          qty,
          unitValue: parseMoney(product.price),
          productName: product.productInfo.title,
          productSku: product.productInfo.label,
          warehouseName: warehouse.name,
          orderDate,
        });
      }
    }

    try {
      const batch = await applyEntries.mutateAsync({ type: entryType, lines: payload });
      if (entryType === 'purchased') {
        try {
          generateReceiveStockPdf(toReceivePdfBatch(batch), {
            storeName: settings?.storeName ?? t('Store'),
            labels: receivePdfLabels(t),
          });
        } catch {
          toast.error(t('Stock received, but the PDF could not be downloaded'));
        }
      }
      toast.success(t(stockEntrySuccessMessage(entryType), { count: batch.lines.length }));
      setGroups([newGroup(defaultWarehouse?.id ?? '')]);
    } catch (error) {
      if (error instanceof StockEntryBatchError && error.type === 'purchased' && error.succeeded > 0) {
        try {
          generateReceiveStockPdf(
            toReceivePdfBatch({
              lines: error.results,
              totalQty: error.results.reduce((sum, row) => sum + row.qty, 0),
              totalValue: error.results.reduce((sum, row) => sum + row.lineTotal, 0),
              orderDate: error.results[0]?.orderDate ?? orderDate,
            }),
            {
              storeName: settings?.storeName ?? t('Store'),
              labels: receivePdfLabels(t),
            },
          );
        } catch {
          // ignore PDF errors on partial success; message below is primary
        }
      }
      toast.error(error instanceof Error ? t(error.message) : t('Unable to apply stock entry'));
    }
  };

  const canAddWarehouse =
    (warehouses ?? []).length > groups.length &&
    (warehouses ?? []).some((warehouse) => !usedWarehouseIds.has(warehouse.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Stock Entry')}</CardTitle>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={entryType}
          onValueChange={(value) => {
            if (isStockEntryType(value)) setEntryType(value);
          }}
          className="ms-auto"
        >
          <ToggleGroupItem value="initial">{t('Initial stock')}</ToggleGroupItem>
          <ToggleGroupItem value="purchased">{t('Purchased stock')}</ToggleGroupItem>
          <ToggleGroupItem value="adjustment">{t('Adjustment')}</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t(stockEntryHelpMessage(entryType))}</p>
        <div className="space-y-4">
          {groups.map((group, index) => {
            const selectedIds = new Set(group.lines.map((line) => line.productId));
            const warehouseId = group.warehouseId || defaultWarehouse?.id || '';
            const warehouseStock = stockByWarehouse.get(warehouseId);
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
                    value={warehouseId}
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
                        const onHand = warehouseStock?.get(line.productId);
                        const available = Math.max((onHand?.qty ?? 0) - (onHand?.reserved ?? 0), 0);
                        return (
                          <div key={line.key} className="flex items-center gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">
                                {product?.productInfo.title ?? t('Unknown product')}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {product?.productInfo.label}
                                {entryType === 'adjustment' ? (
                                  <>
                                    {' · '}
                                    {t('On hand: {qty}', { qty: onHand?.qty ?? 0 })}
                                    {(onHand?.reserved ?? 0) > 0
                                      ? ` (${t('Available: {available}', { available })})`
                                      : ''}
                                  </>
                                ) : null}
                              </div>
                            </div>
                            <Input
                              className="w-24"
                              type="number"
                              min={entryType === 'adjustment' ? undefined : 1}
                              step={1}
                              aria-label={t('Quantity')}
                              placeholder={entryType === 'adjustment' ? '±' : '1'}
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
      </CardContent>
      <CardFooter className="justify-end gap-2.5">
        <Button
          variant="mono"
          onClick={() => void handleSave()}
          disabled={applyEntries.isPending || !(warehouses ?? []).length}
        >
          {t(stockEntrySubmitLabel(entryType))}
        </Button>
      </CardFooter>
    </Card>
  );
}

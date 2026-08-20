'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { toAbsoluteUrl } from '@/lib/helpers';
import { resolveProductImageSrc } from '@/store-inventory/lib/format';
import { Badge, BadgeDot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, InputWrapper } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatMoney } from '@/store-inventory/lib/format';
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
import { Switch } from '@/components/ui/switch';
import { useUpdateStockLevel } from '@/store-inventory/hooks/use-inventory';
import { useActiveWarehouses } from '@/store-inventory/hooks/use-warehouses';

interface CurrentStockData {
  id: string;
  productInfo: {
    image: string;
    title: string;
    label: string;
  };
  stock: number;
  rsvd: number;
  tlvl: number;
  delta: {
    label: string;
    variant: string;
  };
  sum: string;
  lastMoved: string;
  handler: string;
  trend: {
    label: string;
    variant: string;
  };
  category?: string;
  price?: string;
  reorderQty?: number;
  leadTimeDays?: number;
  autoReorder?: boolean;
  created?: string;
  updated?: string;
}

interface PerProductStockSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data?: CurrentStockData;
}

export function PerProductStockSheet({
  open,
  onOpenChange,
  data,
}: PerProductStockSheetProps) {
  const { data: warehouses } = useActiveWarehouses();
  const updateStockLevel = useUpdateStockLevel();
  const defaultWarehouse = warehouses?.find((row) => row.isDefault) ?? warehouses?.[0];

  const [warehouseId, setWarehouseId] = useState('');
  const [stockQty, setStockQty] = useState('0');
  const [threshold, setThreshold] = useState('0');
  const [reorderQty, setReorderQty] = useState('0');
  const [leadTimeDays, setLeadTimeDays] = useState('0');
  const [autoReorder, setAutoReorder] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStockQty(String(data?.stock ?? 0));
    setThreshold(String(data?.tlvl ?? 0));
    setReorderQty(String(data?.reorderQty ?? 0));
    setLeadTimeDays(String(data?.leadTimeDays ?? 0));
    setAutoReorder(Boolean(data?.autoReorder));
    setWarehouseId(defaultWarehouse?.id ?? '');
  }, [open, data, defaultWarehouse?.id]);

  const imageSrc = resolveProductImageSrc(data?.productInfo?.image);
  const resolvedImage =
    imageSrc.startsWith('http') || imageSrc.startsWith('data:') || imageSrc.startsWith('blob:')
      ? imageSrc
      : toAbsoluteUrl(imageSrc);

  const handleSave = async () => {
    if (!data?.id) {
      toast.error('Select a product first');
      return;
    }
    const qty = Number(stockQty);
    const thresholdQty = Number(threshold);
    const reorder = Number(reorderQty);
    const lead = Number(leadTimeDays);
    if (!Number.isFinite(qty) || qty < 0) {
      toast.error('Stock quantity cannot be negative');
      return;
    }
    if (data.rsvd > 0 && qty < data.rsvd) {
      toast.error(`Quantity cannot be below reserved amount (${data.rsvd})`);
      return;
    }
    if (!Number.isFinite(thresholdQty) || thresholdQty < 0) {
      toast.error('Threshold cannot be negative');
      return;
    }
    if (!warehouseId) {
      toast.error('Select a warehouse before editing quantity');
      return;
    }
    setSaving(true);
    try {
      await updateStockLevel.mutateAsync({
        productId: data.id,
        input: {
          warehouseId,
          expectedQty: data.stock,
          qty,
          threshold: thresholdQty,
          reorder_qty: Number.isFinite(reorder) ? Math.max(0, Math.trunc(reorder)) : 0,
          lead_time_days: Number.isFinite(lead) ? Math.max(0, Math.trunc(lead)) : 0,
          auto_reorder: autoReorder,
        },
      });
      toast.success('Stock settings saved');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save stock settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 lg:w-[960px] sm:max-w-none inset-5 border start-auto h-auto rounded-lg p-0 [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="border-b py-3.5 px-5 border-border">
          <SheetTitle className="font-medium">Per Product Stock</SheetTitle>
        </SheetHeader>

        <SheetBody className="p-0 grow px-1.5">
          <ScrollArea
            className="flex flex-col h-[calc(100dvh-10.5rem)]"
            viewportClassName="[&>div]:h-full [&>div>div]:h-full"
          >
            <div className="flex flex-wrap lg:flex-nowrap px-3.5 grow">
              <div className="grow lg:border-e border-border lg:pe-5">
                <div className="flex flex-col gap-2.5 py-5">
                  <div className="flex flex-col gap-2 mb-1.5">
                    <span className="lg:text-[22px] font-semibold text-foreground">
                      {data?.productInfo?.title || 'Product Title'}
                    </span>

                    <div className="flex items-center flex-wrap gap-1.5 text-2sm">
                      <span className="font-normal text-muted-foreground">SKU</span>
                      <span className="font-medium text-foreground/80">
                        {data?.productInfo?.label || 'SKU'}
                      </span>
                      <BadgeDot className="bg-muted-foreground/60 size-1 mx-1" />
                      <span className="font-normal text-muted-foreground">Created</span>
                      <span className="font-medium text-foreground/80">{data?.created || '—'}</span>
                      <BadgeDot className="bg-muted-foreground/60 size-1 mx-1" />
                      <span className="font-normal text-muted-foreground">Last Updated</span>
                      <span className="font-medium text-foreground/80">{data?.updated || '—'}</span>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-2.5">
                    <div className="flex flex-col gap-2.5 grow">
                      <Label className="text-xs">Warehouse</Label>
                      <Select value={warehouseId} onValueChange={setWarehouseId} indicatorPosition="right">
                        <SelectTrigger>
                          <SelectValue placeholder="Select warehouse" />
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
                    <div className="flex flex-col gap-2.5 grow">
                      <Label className="text-xs">Current Stock</Label>
                      <Input
                        type="number"
                        min={0}
                        value={stockQty}
                        onChange={(e) => setStockQty(e.target.value)}
                        className="w-full"
                      />
                      {(data?.rsvd ?? 0) > 0 && (
                        <span className="text-xs text-muted-foreground">
                          Reserved: {data?.rsvd}. Available: {Math.max((data?.stock ?? 0) - (data?.rsvd ?? 0), 0)}.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <Card className="rounded-md mb-5">
                  <CardHeader className="min-h-[34px] bg-accent/50">
                    <CardTitle className="text-2sm">Inventory Rules</CardTitle>
                    <div className="flex items-center gap-2.5">
                      <Label htmlFor="auto-update" className="text-xs">
                        Auto Reorder
                      </Label>
                      <Switch
                        id="auto-update"
                        checked={autoReorder}
                        onCheckedChange={setAutoReorder}
                        size="sm"
                      />
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="grid md:grid-cols-2 lg:gap-5 gap-2 lg:mb-7 mb-5">
                      <div className="flex flex-col gap-2.5">
                        <Label className="text-xs">Threshold Qty</Label>
                        <Input
                          type="number"
                          min={0}
                          value={threshold}
                          onChange={(e) => setThreshold(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-2.5">
                        <Label className="text-xs">Reserved</Label>
                        <Input type="number" value={String(data?.rsvd ?? 0)} disabled />
                      </div>
                      <div className="flex flex-col gap-2.5">
                        <Label className="text-xs">Reorder Qty</Label>
                        <Input
                          type="number"
                          min={0}
                          value={reorderQty}
                          onChange={(e) => setReorderQty(e.target.value)}
                        />
                      </div>

                      <div className="flex flex-col gap-2.5">
                        <Label className="text-xs">Lead Time</Label>
                        <InputWrapper>
                          <Input
                            type="number"
                            min={0}
                            value={leadTimeDays}
                            onChange={(e) => setLeadTimeDays(e.target.value)}
                          />
                          <span className="text-2sm font-normal text-muted-foreground">days</span>
                        </InputWrapper>
                      </div>
                    </div>

                    <div className="flex items-center flex-wrap lg:gap-10 gap-5">
                      {[
                        { label: 'Status', value: (data?.stock ?? 0) > 0 ? 'In Stock' : 'Out of Stock' },
                        { label: 'Delta', value: data?.delta?.label || '0' },
                        { label: 'Trend', value: data?.trend?.label || 'Steady' },
                        { label: 'Last Moved', value: data?.lastMoved || '—' },
                        { label: 'Updated By', value: data?.handler || '—' },
                      ].map((item) => (
                        <div key={item.label} className="flex flex-col gap-1.5">
                          <span className="text-2sm font-normal text-secondary-foreground">{item.label}</span>
                          <span className="text-2sm font-medium text-foreground shrink-0">
                            {item.label === 'Status' ? (
                              <Badge
                                variant={(data?.stock ?? 0) > 0 ? 'success' : 'destructive'}
                                appearance="light"
                                className="shrink-0"
                              >
                                {item.value}
                              </Badge>
                            ) : (
                              item.value
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="w-full shrink-0 lg:w-[320px] py-5 lg:ps-5">
                <div className="mb-3">
                  <Card className="flex items-center justify-center rounded-md bg-accent/50 h-[200px] shadow-none shrink-0">
                    <img src={resolvedImage} className="cursor-pointer h-[200px] object-contain" alt="image" />
                  </Card>
                </div>

                <h3 className="text-foreground text-md font-semibold mb-1">
                  {data?.productInfo?.title || 'Product Title'}
                </h3>

                <div className="flex flex-col gap-3.5 mt-4.5">
                  {[
                    { label: 'SKU', info: data?.productInfo?.label || '—' },
                    { label: 'Category', info: data?.category || '—' },
                    { label: 'Price', info: data?.price || formatMoney(0) },
                    { label: 'Stock value', info: data?.sum || formatMoney(0) },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center lg:gap-6">
                      <span className="basis-1/4 text-secondary-foreground text-2sm font-normal">
                        {item.label}
                      </span>
                      <span className="basis-2/4 text-secondary-foreground text-2sm font-medium">
                        {item.info}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </SheetBody>

        <SheetFooter className="flex items-center not-only-of-type:justify-between border-t py-5 px-5 border-border gap-2">
          <div />
          <div className="flex items-center gap-2.5">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="mono" onClick={handleSave} disabled={saving || !data?.id}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

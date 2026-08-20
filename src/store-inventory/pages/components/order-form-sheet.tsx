'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { formatMoney, generateOrderNumber, parseMoney } from '@/store-inventory/lib/format';
import { mapOrderError } from '@/store-inventory/lib/order-errors';
import { computeOrderPricing } from '@/store-inventory/lib/order-pricing';
import {
  ORDER_DELIVERY_STATUSES,
  ORDER_PAYMENT_STATUSES,
  canTransitionDelivery,
  canTransitionPayment,
  normalizeDeliveryStatus,
  normalizePaymentStatus,
} from '@/store-inventory/lib/order-status';
import {
  useCarriers,
  useCreateOrder,
  useCustomers,
  useOrderItems,
  useProducts,
  useUpdateOrder,
} from '@/store-inventory/hooks/use-inventory';
import { useActiveWarehouses } from '@/store-inventory/hooks/use-warehouses';
import { useStoreSettings } from '@/store-inventory/hooks/use-settings';
import type { OrderListRow } from '@/store-inventory/types';

const defaultCarriers = [
  { id: 'ups', name: 'UPS Global', logo: 'ups.svg' },
  { id: 'dhl', name: 'DHL Express', logo: 'dhl.svg' },
  { id: 'fedex', name: 'FedEx', logo: 'fedex.svg' },
];

type DraftLine = {
  key: string;
  productId: string;
  quantity: number;
};

interface OrderFormSheetProps {
  mode: 'new' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: OrderListRow;
}

export function OrderFormSheet({ mode, open, onOpenChange, order }: OrderFormSheetProps) {
  const isNewMode = mode === 'new';
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const { data: customers } = useCustomers();
  const { data: products } = useProducts();
  const { data: carriers } = useCarriers();
  const { data: warehouses } = useActiveWarehouses();
  const { data: storeSettings } = useStoreSettings();
  const { data: existingItems } = useOrderItems(open && !isNewMode ? order?.id : undefined);
  const carrierOptions = carriers?.length ? carriers : defaultCarriers;

  const liveProducts = useMemo(
    () =>
      (products ?? []).filter((product) => {
        const status = product.status.label.toLowerCase();
        return status === 'live' || status === 'active';
      }),
    [products],
  );

  const [orderNumber, setOrderNumber] = useState('');
  const [date, setDate] = useState(format(new Date(), 'd MMM, yyyy'));
  const [customerId, setCustomerId] = useState('');
  const [category, setCategory] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('Unpaid');
  const [deliveryStatus, setDeliveryStatus] = useState('Pending');
  const [carrierName, setCarrierName] = useState('UPS Global');
  const [warehouseId, setWarehouseId] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([{ key: crypto.randomUUID(), productId: '', quantity: 1 }]);
  const [itemsDirty, setItemsDirty] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOrderNumber(order?.order ?? (isNewMode ? generateOrderNumber() : ''));
    setDate(order?.date ?? format(new Date(), 'd MMM, yyyy'));
    setCustomerId(order?.customerId ?? '');
    setCategory(order?.category ?? '');
    setPaymentStatus(normalizePaymentStatus(order?.paymentStatus.label));
    setDeliveryStatus(normalizeDeliveryStatus(order?.deliveryStatus.label));
    setCarrierName(order?.carrier.name || 'UPS Global');
    setWarehouseId(warehouses?.find((row) => row.isDefault)?.id ?? warehouses?.[0]?.id ?? '');
    setItemsDirty(false);
    if (isNewMode) {
      setLines([{ key: crypto.randomUUID(), productId: '', quantity: 1 }]);
    }
  }, [open, order, isNewMode, warehouses]);

  useEffect(() => {
    if (!open || isNewMode || itemsDirty) return;
    if (!existingItems?.length) {
      setLines([{ key: crypto.randomUUID(), productId: '', quantity: 1 }]);
      return;
    }
    setLines(
      existingItems.map((item) => ({
        key: item.id,
        productId: item.productId ?? '',
        quantity: Math.max(item.quantity ?? 1, 1),
      })),
    );
  }, [open, isNewMode, existingItems, itemsDirty]);

  const selectedCustomer = useMemo(
    () => customers?.find((customer) => customer.id === customerId),
    [customers, customerId],
  );
  const selectedCarrier = carrierOptions.find((carrier) => carrier.name === carrierName);
  const isPending = createOrder.isPending || updateOrder.isPending;

  const builtItems = useMemo(() => {
    return lines
      .filter((line) => line.productId)
      .map((line) => {
        const product = liveProducts.find((row) => row.id === line.productId);
        if (!product) return null;
        return {
          productId: product.id,
          category: product.category,
          price: parseMoney(product.price),
          quantity: Math.max(Math.trunc(line.quantity) || 1, 1),
          productName: product.productInfo.title,
          productSku: product.productInfo.label,
          productImage: product.productInfo.image,
          warehouseId: warehouseId || null,
        };
      })
      .filter(Boolean) as Array<{
      productId: string;
      category: string;
      price: number;
      quantity: number;
      productName: string;
      productSku: string;
      productImage?: string;
      warehouseId: string | null;
    }>;
  }, [lines, liveProducts, warehouseId]);

  const pricingPreview = useMemo(
    () =>
      computeOrderPricing(builtItems, {
        taxPercent: storeSettings?.taxPercent,
        taxCalculation: storeSettings?.taxCalculation,
        freeShippingEnabled: storeSettings?.freeShippingEnabled,
        freeShippingMin: storeSettings?.freeShippingMin,
      }),
    [builtItems, storeSettings],
  );

  const paymentOptions = useMemo(() => {
    const current = normalizePaymentStatus(order?.paymentStatus.label);
    if (isNewMode) return [...ORDER_PAYMENT_STATUSES];
    return ORDER_PAYMENT_STATUSES.filter(
      (status) => status === paymentStatus || canTransitionPayment(current, status),
    );
  }, [isNewMode, order?.paymentStatus.label, paymentStatus]);

  const deliveryOptions = useMemo(() => {
    const current = normalizeDeliveryStatus(order?.deliveryStatus.label);
    if (isNewMode) return ORDER_DELIVERY_STATUSES.filter((status) => status !== 'Canceled');
    return ORDER_DELIVERY_STATUSES.filter(
      (status) => status === deliveryStatus || canTransitionDelivery(current, status),
    );
  }, [isNewMode, order?.deliveryStatus.label, deliveryStatus]);

  const updateLine = (key: string, patch: Partial<DraftLine>) => {
    setItemsDirty(true);
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  const handleSave = async () => {
    const customerName = selectedCustomer?.customerInfo.title || order?.customer || '';
    if (!customerName.trim()) {
      toast.error('Customer is required');
      return;
    }
    if (isNewMode || itemsDirty) {
      if (!builtItems.length) {
        toast.error('Add at least one product line');
        return;
      }
    } else if (!existingItems?.length && !builtItems.length) {
      toast.error('Add at least one product line');
      return;
    }
    if (!warehouseId && (warehouses?.length ?? 0) > 0) {
      toast.error('Select a warehouse');
      return;
    }

    const idempotencyKey = isNewMode ? crypto.randomUUID() : undefined;

    try {
      if (!isNewMode && order?.id) {
        await updateOrder.mutateAsync({
          id: order.id,
          input: {
            orderNumber,
            date,
            customerId: customerId || null,
            customerName,
            category,
            paymentStatus,
            deliveryStatus,
            carrierId: carriers?.length ? selectedCarrier?.id : undefined,
            carrierName,
            carrierLogo: selectedCarrier?.logo,
            warehouseId: warehouseId || null,
            storeId: storeSettings?.id ?? null,
            ...(itemsDirty ? { items: builtItems } : {}),
          },
        });
      } else {
        await createOrder.mutateAsync({
          orderNumber,
          date,
          customerId: customerId || null,
          customerName,
          category,
          paymentStatus,
          deliveryStatus,
          carrierName,
          carrierLogo: selectedCarrier?.logo,
          warehouseId: warehouseId || null,
          storeId: storeSettings?.id ?? null,
          idempotencyKey,
          items: builtItems,
        });
      }
      toast.success(isNewMode ? 'Order created' : 'Order saved');
      onOpenChange(false);
    } catch (error) {
      toast.error(mapOrderError(error).message);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 lg:w-[720px] sm:max-w-none inset-5 border start-auto h-auto rounded-lg p-0 [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="border-b py-3.5 px-5 border-border">
          <SheetTitle className="font-medium">{isNewMode ? 'New Order' : 'Edit Order'}</SheetTitle>
        </SheetHeader>
        <SheetBody className="p-0 grow">
          <ScrollArea className="h-[calc(100dvh-10rem)] px-5 py-5">
            <div className="space-y-5 max-w-xl">
              <div className="flex items-center gap-10">
                <Label className="text-xs font-medium w-28 shrink-0">Order Number</Label>
                <Input value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} />
              </div>
              <div className="flex items-center gap-10">
                <Label className="text-xs font-medium w-28 shrink-0">Date</Label>
                <Input value={date} onChange={(event) => setDate(event.target.value)} />
              </div>
              <div className="flex items-center gap-10">
                <Label className="text-xs font-medium w-28 shrink-0">Customer</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {(customers ?? []).map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.customerInfo.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-10">
                <Label className="text-xs font-medium w-28 shrink-0">Category</Label>
                <Input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Electronics" />
              </div>
              <div className="flex items-center gap-10">
                <Label className="text-xs font-medium w-28 shrink-0">Payment</Label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-10">
                <Label className="text-xs font-medium w-28 shrink-0">Delivery</Label>
                <Select value={deliveryStatus} onValueChange={setDeliveryStatus}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-10">
                <Label className="text-xs font-medium w-28 shrink-0">Carrier</Label>
                <Select value={carrierName} onValueChange={setCarrierName}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {carrierOptions.map((carrier) => (
                      <SelectItem key={carrier.id} value={carrier.name}>
                        {carrier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(warehouses?.length ?? 0) > 0 && (
                <div className="flex items-center gap-10">
                  <Label className="text-xs font-medium w-28 shrink-0">Warehouse</Label>
                  <Select value={warehouseId} onValueChange={setWarehouseId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses?.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                          {warehouse.isDefault ? ' (Default)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Line items</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setItemsDirty(true);
                      setLines((current) => [
                        ...current,
                        { key: crypto.randomUUID(), productId: '', quantity: 1 },
                      ]);
                    }}
                  >
                    <Plus className="size-3.5" />
                    Add line
                  </Button>
                </div>
                {lines.map((line) => (
                  <div key={line.key} className="flex items-center gap-2">
                    <Select
                      value={line.productId}
                      onValueChange={(value) => updateLine(line.key, { productId: value })}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {liveProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.productInfo.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      className="w-20"
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(line.key, {
                          quantity: Math.max(Number(event.target.value) || 1, 1),
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={lines.length <= 1}
                      onClick={() => {
                        setItemsDirty(true);
                        setLines((current) => current.filter((row) => row.key !== line.key));
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                <div className="text-sm text-muted-foreground space-y-1 pt-1">
                  <div>Subtotal: {formatMoney(pricingPreview.subtotal)}</div>
                  <div>Shipping: {formatMoney(pricingPreview.shippingCost)}</div>
                  <div>Tax: {formatMoney(pricingPreview.tax)}</div>
                  <div className="font-medium text-foreground">Total: {formatMoney(pricingPreview.total)}</div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </SheetBody>
        <SheetFooter className="flex-row border-t pb-4 p-5 border-border gap-2.5">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="mono" onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving...' : isNewMode ? 'Create' : 'Save'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

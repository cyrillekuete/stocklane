'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
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
import { generateOrderNumber, parseMoney } from '@/store-inventory/lib/format';
import {
  useCarriers,
  useCreateOrder,
  useCustomers,
  useProducts,
  useUpdateOrder,
} from '@/store-inventory/hooks/use-inventory';
import type { OrderListRow } from '@/store-inventory/types';

const paymentStatuses = ['Paid', 'Pending', 'Unpaid', 'Failed', 'Cancelled'];
const deliveryStatuses = ['Pending', 'Packed', 'Shipped', 'Delivered', 'On Hold', 'Canceled'];
const defaultCarriers = [
  { id: 'ups', name: 'UPS Global', logo: 'ups.svg' },
  { id: 'dhl', name: 'DHL Express', logo: 'dhl.svg' },
  { id: 'fedex', name: 'FedEx', logo: 'fedex.svg' },
];

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
  const carrierOptions = carriers?.length ? carriers : defaultCarriers;

  const [orderNumber, setOrderNumber] = useState('');
  const [date, setDate] = useState(format(new Date(), 'd MMM, yyyy'));
  const [customerId, setCustomerId] = useState('');
  const [category, setCategory] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('Unpaid');
  const [deliveryStatus, setDeliveryStatus] = useState('Pending');
  const [carrierName, setCarrierName] = useState('UPS Global');
  const [productId, setProductId] = useState('');

  useEffect(() => {
    if (!open) return;
    setOrderNumber(order?.order ?? (isNewMode ? generateOrderNumber() : ''));
    setDate(order?.date ?? format(new Date(), 'd MMM, yyyy'));
    setCustomerId(order?.customerId ?? '');
    setCategory(order?.category ?? '');
    setPaymentStatus(order?.paymentStatus.label ?? 'Unpaid');
    setDeliveryStatus(order?.deliveryStatus.label ?? 'Pending');
    setCarrierName(order?.carrier.name || 'UPS Global');
    setProductId('');
  }, [open, order, isNewMode]);

  const selectedCustomer = useMemo(
    () => customers?.find((customer) => customer.id === customerId),
    [customers, customerId],
  );
  const selectedProduct = useMemo(
    () => products?.find((product) => product.id === productId),
    [products, productId],
  );
  const selectedCarrier = carrierOptions.find((carrier) => carrier.name === carrierName);
  const isPending = createOrder.isPending || updateOrder.isPending;

  const handleSave = async () => {
    const customerName = selectedCustomer?.customerInfo.title || order?.customer || '';
    if (!customerName.trim()) {
      toast.error('Customer is required');
      return;
    }
    const items = selectedProduct
      ? [
          {
            productId: selectedProduct.id,
            category: selectedProduct.category,
            price: parseMoney(selectedProduct.price),
            quantity: 1,
          },
        ]
      : undefined;
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
            items,
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
          items,
        });
      }
      toast.success(isNewMode ? 'Order created' : 'Order saved');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save order');
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
                    {paymentStatuses.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
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
                    {deliveryStatuses.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
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
                      <SelectItem key={carrier.id} value={carrier.name}>{carrier.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-10">
                <Label className="text-xs font-medium w-28 shrink-0">Product</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Optional line item" />
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
            </div>
          </ScrollArea>
        </SheetBody>
        <SheetFooter className="flex-row border-t pb-4 p-5 border-border gap-2.5">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="mono" onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving...' : isNewMode ? 'Create' : 'Save'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

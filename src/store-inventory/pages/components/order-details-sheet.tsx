'use client';

import React from 'react';
import { Circle, CircleCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useT } from '@/i18n/use-t';
import { Badge, BadgeDot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, InputWrapper } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Stepper, StepperItem, StepperNav, StepperTrigger } from '@/components/ui/stepper';
import { isSupabaseConfigured } from '@/lib/supabase';
import { toAbsoluteUrl } from '@/lib/helpers';
import {
  allOrderListMockData,
  buildOrderDetail,
  defaultOrderDetail,
  orderItemsMockData,
} from '@/store-inventory/data/orders';
import { useCancelOrder, useOrder, useOrderItems } from '@/store-inventory/hooks/use-inventory';
import type { OrderDetailRow, OrderListRow } from '@/store-inventory/types';

const steps = [
  { title: 'Picking' },
  { title: 'Packed' },
  { title: 'Shipping' },
  { title: 'Delivered' },
];

interface OrderDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId?: string;
  order?: OrderListRow;
  onTrackShipping?: () => void;
  onViewShippingLabel?: () => void;
}

function resolveFallback(orderId?: string, order?: OrderListRow): OrderDetailRow {
  if (order) return buildOrderDetail(order, []);
  const match = allOrderListMockData.find((row) => row.id === orderId || row.order === orderId);
  return match ? buildOrderDetail(match, []) : defaultOrderDetail;
}

export function OrderDetailsSheet({
  open,
  onOpenChange,
  orderId,
  order,
  onTrackShipping,
  onViewShippingLabel,
}: OrderDetailsSheetProps) {
  const t = useT();
  const { data: remoteOrder } = useOrder(isSupabaseConfigured ? orderId : undefined);
  const { data: remoteItems } = useOrderItems(isSupabaseConfigured ? orderId : undefined);
  const cancelOrder = useCancelOrder();
  const fallback = resolveFallback(orderId, order);
  const detail =
    remoteOrder ??
    (order || fallback
      ? buildOrderDetail(
          order ?? fallback,
          isSupabaseConfigured ? (remoteItems ?? []) : orderItemsMockData,
        )
      : defaultOrderDetail);
  const currentStep = Math.min(Math.max(detail.currentStep || 1, 1), 4);
  const items = detail.detailItems;

  const handleDelete = () => {
    if (!detail.id || !isSupabaseConfigured) {
      onOpenChange(false);
      return;
    }
    cancelOrder.mutate(
      { id: detail.id, reason: 'Canceled from order details' },
      {
        onSuccess: () => {
          toast.success(t('Order canceled'));
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : t('Unable to cancel order'));
        },
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 lg:w-[1080px] sm:max-w-none inset-5 border start-auto h-auto rounded-lg p-0 [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="border-b py-3.5 px-5 border-border">
          <SheetTitle className="font-medium">{t('Order Details')}</SheetTitle>
        </SheetHeader>

        <SheetBody className="p-0 grow">
          <div className="flex justify-between gap-2 border-b border-border px-5 py-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <span className="lg:text-[22px] font-semibold text-foreground leading-none">
                  {t('Order')}:  {detail.order}
                </span>
                <Badge size="sm" variant={detail.deliveryStatus.variant as 'success'} appearance="light">
                  {t(detail.deliveryStatus.label)}
                </Badge>
              </div>
              <div className="flex items-center flex-wrap gap-1.5 text-2sm">
                <span className="font-normal text-muted-foreground">{t('Created')}</span>
                <span className="font-medium text-foreground/80">{detail.date}</span>
                <BadgeDot className="bg-muted-foreground/60 size-1 mx-1" />
                <span className="font-normal text-muted-foreground">{t('Customer')}:</span>
                <span className="font-medium text-foreground/80">{detail.customer}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Button variant="ghost" onClick={handleDelete}>{t('Cancel Order')}</Button>
              <Button variant="outline" onClick={onTrackShipping}>{t('Order Tracking')}</Button>
              <Button variant="mono" onClick={onViewShippingLabel}>{t('View Shipping Label')}</Button>
            </div>
          </div>
          <ScrollArea
            className="flex flex-col h-[calc(100vh-15.8rem)] mx-1.5"
            viewportClassName="[&>div]:h-full [&>div>div]:h-full"
          >
            <div className="flex flex-wrap lg:flex-nowrap px-3.5 grow">
              <div className="grow lg:border-e border-border lg:pe-5 space-y-5 pt-5">
                <Card className="rounded-md">
                  <CardHeader className="min-h-[34px] bg-accent/50">
                    <CardTitle className="text-2sm">{t('Order Data')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start flex-wrap lg:gap-10 gap-5">
                      {[
                        { label: t('Items'), value: t('{count} Items', { count: items.length }) },
                        { label: t('Total Price'), value: detail.subtotal },
                        { label: t('Shipping Priority'), value: detail.shippingPriority },
                        { label: t('Delivery Method'), value: detail.deliveryMethod },
                      ].map((item) => (
                        <div key={item.label} className="flex flex-col gap-1.5">
                          <span className="text-2sm font-normal text-secondary-foreground">{item.label}</span>
                          <span className="text-2sm font-medium text-foreground">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-md">
                  <CardHeader className="min-h-[34px] bg-accent/50">
                    <CardTitle className="text-2sm">{t('Team')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {items.map((item, index) => (
                      <React.Fragment key={`${item.sku}-${index}`}>
                        <div className="flex flex-col p-0">
                          <div className="flex items-center flex-wrap sm:flex-nowrap w-full justify-between gap-3.5">
                            <div className="flex md:items-center gap-3.5">
                              <Card className="flex items-center justify-center bg-accent/50 h-[50px] w-[60px] shadow-none shrink-0 rounded-md">
                                <img
                                  src={toAbsoluteUrl(`/media/store/client/1200x1200/${item.image}`)}
                                  className="h-[50px]"
                                  alt={item.title}
                                />
                              </Card>
                              <div className="flex flex-col justify-center gap-1.5 -mt-1">
                                <Link to="#" className="hover:text-primary text-sm font-medium text-dark leading-5.5">
                                  {item.title}
                                </Link>
                                <div className="flex items-center gap-2.5">
                                  <span className="text-xs font-normal text-secondary-foreground">
                                    {t('SKU')}:{' '}
                                    <span className="text-xs font-medium text-foreground">{item.sku}</span>
                                  </span>
                                  <BadgeDot className="bg-muted-foreground size-1 shrink-0" />
                                  <span className="text-xs font-normal text-secondary-foreground">
                                    {t('Color')}
                                    <span className="text-xs font-medium text-secondary-foreground ms-1">
                                      {item.color}
                                    </span>
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col text-end gap-2.5">
                              <span className="text-xs font-medium text-dark">{t('Weight')}</span>
                              <InputWrapper className="w-[66px] h-[28px]">
                                <Input type="text" defaultValue={item.weight} readOnly />
                                <span className="text-2sm font-normal text-muted-foreground">kg</span>
                              </InputWrapper>
                            </div>
                          </div>
                          {index !== items.length - 1 && <Separator className="my-3.5" />}
                        </div>
                      </React.Fragment>
                    ))}
                  </CardContent>
                </Card>

                <Card className="rounded-md">
                  <CardContent className="p-0">
                    <div className="flex items-start flex-wrap gap-5 justify-between bg-accent/50 p-5 border-b border-border">
                      <div className="relative">
                        <div className="flex items-center space-x-2">
                          <BadgeDot className="bg-secondary-foreground size-1.5 shrink-0" />
                          <span className="font-medium text-2sm text-secondary-foreground leading-3">
                            {detail.originAddress}
                          </span>
                        </div>
                        <Separator
                          className="min-h-3.5 ml-[2px] top-0 bottom-0 bg-muted-foreground/30 w-0.5 mt-px"
                          orientation="vertical"
                        />
                        <div className="flex items-center space-x-2">
                          <BadgeDot className="bg-secondary-foreground size-1.5 shrink-0" />
                          <span className="font-medium text-2sm text-secondary-foreground leading-3">
                            {detail.destinationAddress}
                          </span>
                        </div>
                      </div>
                      <Button variant="outline" className="shrink-0">
                        <img
                          src={toAbsoluteUrl(`/media/brand-logos/${detail.carrier.logo || 'ups.svg'}`)}
                          alt={detail.carrier.name}
                          className="h-4 w-4"
                        />{' '}
                        {detail.carrier.name || 'UPS Global'}
                      </Button>
                    </div>

                    <Stepper defaultValue={currentStep} className="w-full p-5 pt-3">
                      <StepperNav className="flex w-full flex-wrap gap-2">
                        {steps.map((step, index) => {
                          const stepNumber = index + 1;
                          const isCompleted = stepNumber < currentStep;
                          const isActive = stepNumber === currentStep;
                          return (
                            <StepperItem key={step.title} step={stepNumber} className="relative flex-1 flex items-center">
                              <StepperTrigger className="flex flex-col items-center w-full">
                                <div className="h-1.5 w-full mt-2 rounded-full bg-border relative">
                                  {index === steps.length - 2 ? (
                                    <div className="h-full w-1/2 bg-green-500 absolute top-0 left-0 rounded-l-full mb-5" />
                                  ) : index < steps.length - 2 ? (
                                    <div className="h-full w-full bg-green-500 absolute top-0 left-0 rounded-full" />
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-0.5 w-full -ms-1">
                                  <div className="flex items-center gap-1">
                                    {isCompleted || isActive ? (
                                      <CircleCheck
                                        className={isCompleted ? 'fill-green-500 text-background' : 'text-green-500 border-background border-2'}
                                        size={18}
                                      />
                                    ) : (
                                      <Circle className="text-muted-foreground border-background border-2" size={18} />
                                    )}
                                  </div>
                                  <span className="font-medium text-secondary-foreground/80 text-2sm">{t(step.title)}</span>
                                </div>
                              </StepperTrigger>
                            </StepperItem>
                          );
                        })}
                      </StepperNav>
                    </Stepper>
                  </CardContent>
                </Card>
              </div>

              <div className="w-full shrink-0 lg:w-[320px] py-5 lg:ps-5">
                <Card className="rounded-md">
                  <CardHeader className="min-h-[34px] bg-accent/50">
                    <CardTitle className="text-2sm">{t('Summary')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-foreground">{detail.shippingLabel}</span>
                      <span className="text-2sm font-normal text-secondary-foreground">{detail.shippingLine1}</span>
                      <span className="text-2sm font-normal text-secondary-foreground">{detail.shippingLine2}</span>
                    </div>
                    <Separator className="mb-4 mt-4.5" />
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-foreground">{t('Price Details')}</span>
                      {[
                        [t('Subtotal'), detail.subtotal],
                        [t('Shipping'), detail.shippingCost],
                        [t('Tax'), detail.tax],
                        [t('Total'), detail.total],
                      ].map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-2sm font-normal text-secondary-foreground">{key}</span>
                          <span className="text-2sm font-medium text-foreground">{value}</span>
                        </div>
                      ))}
                    </div>
                    <Separator className="my-4" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-normal text-secondary-foreground">{t('Total')}</span>
                      <span className="text-sm font-semibold text-foreground">{detail.total}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </ScrollArea>
        </SheetBody>

        <SheetFooter className="flex items-center not-only-of-type:justify-between border-t py-5 px-5 border-border gap-2">
          <div className="text-xs font-medium text-secondary-foreground">
            {t('Read Shipping')}
            <Link to="#" className="hover:text-primary text-xs font-medium text-primary ms-1">
              {t('Terms & Conditions')}
            </Link>
          </div>
          <div className="flex items-center gap-2.5">
            <Button variant="ghost" onClick={handleDelete}>{t('Cancel Order')}</Button>
            <Button variant="outline" onClick={onTrackShipping}>{t('Order Tracking')}</Button>
            <Button variant="mono" onClick={onViewShippingLabel}>{t('View Shipping Label')}</Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

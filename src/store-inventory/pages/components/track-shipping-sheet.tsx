'use client';

import { Circle, CircleCheck, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge, BadgeDot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Stepper,
  StepperItem,
  StepperNav,
  StepperTitle,
  StepperTrigger,
} from '@/components/ui/stepper';
import { isSupabaseConfigured } from '@/lib/supabase';
import { toAbsoluteUrl } from '@/lib/helpers';
import { useT } from '@/i18n/use-t';
import {
  allOrderListMockData,
  buildOrderDetail,
  defaultTrackingDetail,
} from '@/store-inventory/data/orders';
import { useCancelOrder, useOrder, useOrderTracking } from '@/store-inventory/hooks/use-inventory';
import type { OrderListRow } from '@/store-inventory/types';

const steps = [
  { title: 'Picking' },
  { title: 'Packed' },
  { title: 'Shipping' },
  { title: 'Delivered' },
];

interface TrackShippingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId?: string;
  order?: OrderListRow;
}

function resolveFallback(orderId?: string, order?: OrderListRow) {
  if (order) return buildOrderDetail(order);
  const match = allOrderListMockData.find((row) => row.id === orderId || row.order === orderId);
  return match ? buildOrderDetail(match) : defaultTrackingDetail;
}

export function TrackShippingSheet({
  open,
  onOpenChange,
  orderId,
  order,
}: TrackShippingSheetProps) {
  const t = useT();
  const { data: remoteOrder } = useOrder(isSupabaseConfigured ? orderId : undefined);
  const { data: remoteEvents } = useOrderTracking(isSupabaseConfigured ? orderId : undefined);
  const cancelOrderMutation = useCancelOrder();
  const fallback = resolveFallback(orderId, order);
  const detail = remoteOrder ?? fallback;
  const events = remoteEvents?.length
    ? remoteEvents
    : isSupabaseConfigured
      ? []
      : detail.trackingEvents;
  const currentStep = Math.min(Math.max(detail.currentStep || 1, 1), 4);

  const handleCancel = () => {
    if (!detail.id || !isSupabaseConfigured) {
      onOpenChange(false);
      return;
    }
    cancelOrderMutation.mutate(
      { id: detail.id, reason: 'Canceled from tracking' },
      {
        onSuccess: () => {
          toast.success(t('Order canceled'));
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(error instanceof Error ? t(error.message) : t('Unable to cancel order'));
        },
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:w-[720px] sm:max-w-none inset-3.5 border start-auto h-auto rounded-lg p-0 [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="border-b py-3.5 px-5 border-border">
          <SheetTitle className="font-medium">{t('Track Shipping')}</SheetTitle>
        </SheetHeader>
        <SheetBody className="p-0 lg:pt-2">
          <ScrollArea className="h-[calc(100dvh-11.75rem)] px-5 me-1">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-7">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2.5">
                  <h3 className="lg:text-[22px] font-semibold text-foreground">
                    {detail.shipmentNumber}
                  </h3>
                  <Badge size="sm" variant={detail.deliveryStatus.variant as 'success'} appearance="light">
                    {t(detail.deliveryStatus.label)}
                  </Badge>
                </div>
                <div className="flex items-center flex-wrap gap-1.5 text-2sm">
                  <span className="font-normal text-muted-foreground">{t('Placed')}</span>
                  <span className="font-medium text-foreground/80">{detail.date}</span>
                  <BadgeDot className="bg-muted-foreground/60 size-1 mx-1" />
                  <span className="font-normal text-muted-foreground">{t('Order ID')}</span>
                  <Link to="#" className="font-medium text-foreground underline">
                    {detail.order}
                  </Link>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Button variant="ghost" onClick={handleCancel}>{t('Cancel Order')}</Button>
                <Button variant="outline">{t('Notify Customer')}</Button>
              </div>
            </div>

            <Card className="rounded-md mb-5">
              <CardContent className="p-0">
                <div className="flex items-start flex-wrap gap-5 justify-between bg-accent/50 p-5">
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
                              <StepperTitle className="font-medium text-secondary-foreground/80 text-2sm">
                                {t(step.title)}
                              </StepperTitle>
                            </div>
                          </StepperTrigger>
                        </StepperItem>
                      );
                    })}
                  </StepperNav>
                </Stepper>
              </CardContent>
            </Card>

            <Card className="rounded-md mb-5">
              <CardHeader className="min-h-[34px] bg-accent/50">
                <CardTitle className="text-2sm">{t('Shipping Data')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-4 gap-5">
                  {[
                    { label: t('Total Time'), value: detail.totalTime },
                    { label: t('Dep. Time'), value: detail.departureTime },
                    { label: t('Exp. Arrival'), value: detail.expectedArrival },
                    { label: t('Tracking No.'), value: detail.trackingNumber },
                  ].map((item) => (
                    <div key={item.label} className="flex flex-col gap-1.5">
                      <span className="text-2sm font-normal text-muted-foreground">{item.label}</span>
                      <span className="text-2sm font-medium text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-md">
              <CardHeader className="min-h-[34px] bg-accent/50">
                <CardTitle className="text-2sm">{t('Shipping Log')}</CardTitle>
              </CardHeader>
              <CardContent>
                {events.map((item, index) => (
                  <div key={item.id} className="flex items-start gap-2 relative mb-3.5">
                    <div className="flex flex-col items-center gap-2 h-full mt-1">
                      <BadgeDot className="bg-secondary-foreground size-1.5 shrink-0 z-1" />
                      {index < events.length - 1 && (
                        <Separator
                          className="h-full absolute w-0.5 bg-muted-foreground/30 rounded-t-full rounded-b-full top-3.5"
                          orientation="vertical"
                        />
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2sm font-medium text-foreground">{t(item.title)}</span>
                        <span className="text-xs text-muted-foreground font-normal">{item.date}</span>
                      </div>
                      <span className="text-xs font-normal text-muted-foreground">{t(item.description)}</span>
                      {item.location && (
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="size-3.5 text-muted-foreground" />
                          <span className="text-2xs font-normal text-muted-foreground">{item.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </ScrollArea>
        </SheetBody>
        <SheetFooter className="flex items-center not-only-of-type:justify-between border-t py-4 px-5 border-border">
          <Button className="w-full" variant="outline" onClick={() => onOpenChange(false)}>
            {t('Close')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

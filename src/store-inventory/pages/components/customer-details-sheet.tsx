'use client';

import { formatDistanceToNow } from 'date-fns';
import { useT } from '@/i18n/use-t';
import { Badge, BadgeDot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CustomerDetailsOverviews } from './customers/customer-details-overviews';
import { CustomerDetailsOrders } from './customers/customer-details-orders';
import { CustomerDetailsInvoice } from './customers/customer-details-invoice';
import { CustomerDetailsBilling } from './customers/customer-details-billing';
import { CustomerDetailsReviews } from './customers/customer-details-reviews';
import { CustomerDetailsActivity } from './customers/customer-details-active';
import { CustomerDetailsAccount } from './customers/customer-details-account';
import { Upload } from './customers/components/upload';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useCustomerOrders } from '@/store-inventory/hooks/use-inventory';
import { mapOrderToDetails, mapOrderToInvoice } from '@/store-inventory/services/inventory';
import type { CustomerListRow } from '@/store-inventory/types';

function lastVisitLabel(customer?: CustomerListRow) {
  if (customer?.lastVisitAt) {
    const parsed = new Date(customer.lastVisitAt);
    if (!Number.isNaN(parsed.getTime())) {
      return formatDistanceToNow(parsed, { addSuffix: true });
    }
  }
  return customer?.lastVisit || customer?.updated || '—';
}

export function CustomerDetailsSheet({
  open,
  onOpenChange,
  onEditClick,
  onDepositClick,
  customer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditClick?: () => void;
  onDepositClick?: () => void;
  customer?: CustomerListRow;
}) {
  const t = useT();
  const { data: liveOrders = [] } = useCustomerOrders(open ? customer?.id : undefined);
  const orders = isSupabaseConfigured ? liveOrders : [];
  const detailsOrders = orders.map(mapOrderToDetails);
  const invoices = orders.map(mapOrderToInvoice);
  const email = customer?.customerInfo.label;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 lg:w-[1160px] sm:max-w-none inset-5 border start-auto h-auto rounded-lg p-0 [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="border-b py-3.5 px-5 border-border">
          <SheetTitle className="font-medium">{t('Customer Details')}</SheetTitle>
        </SheetHeader>

        <SheetBody className="p-0 grow">
          <div className="flex justify-between flex-wrap gap-2 border-b border-border px-5 py-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <span className="lg:text-[22px] font-semibold text-foreground leading-none">
                  {customer?.customerInfo.title || t('Customer')}
                </span>
                {customer && (
                  <Badge size="sm" variant={customer.status.variant === 'success' ? 'success' : customer.status.variant === 'destructive' ? 'destructive' : 'secondary'} appearance="light">
                    {t(customer.status.label)}
                  </Badge>
                )}
              </div>
              <div className="flex items-center flex-wrap gap-2 text-2sm">
                <span className="font-normal text-muted-foreground">{t('Customer ID')}:</span>
                <span className="font-medium text-foreground">{customer?.user || '—'}</span>
                <BadgeDot className="bg-muted-foreground size-1" />
                <span className="font-normal text-muted-foreground">{t('Joined')}</span>
                <span className="font-medium text-foreground">{customer?.joined || customer?.updated || '—'}</span>
                <BadgeDot className="bg-muted-foreground size-1" />
                <span className="font-normal text-muted-foreground">{t('Last Visit')}</span>
                <span className="font-medium text-foreground">{lastVisitLabel(customer)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('Close')}</Button>
              <Button variant="outline" asChild disabled={!email}>
                <a href={email ? `mailto:${email}` : undefined}>{t('Send Email')}</a>
              </Button>
              <Button variant="mono" onClick={onEditClick} disabled={!customer}>{t('Edit Details')}</Button>
              <Button variant="outline" onClick={onDepositClick} disabled={!customer}>{t('Deposit')}</Button>
            </div>
          </div>
          <ScrollArea
            className="flex flex-col h-[calc(100dvh-15.8rem)] mx-1.5"
            viewportClassName="[&>div]:h-full [&>div>div]:h-full"
          >
            <div className="flex flex-wrap lg:flex-nowrap px-3.5 grow">
              <div className="w-full shrink-0 lg:w-[280px] py-5 lg:pe-5 space-y-4">
                <Upload customer={customer} />
              </div>
              <div className="grow lg:border-s border-border space-y-5 py-5 lg:ps-5">
                <Tabs defaultValue="overview" className="w-auto text-sm text-muted-foreground">
                  <TabsList className="inline-flex w-auto grow-0 mb-2.5">
                    <TabsTrigger value="overview">{t('Overview')}</TabsTrigger>
                    <TabsTrigger value="account">{t('Account')}</TabsTrigger>
                    <TabsTrigger value="orders">{t('Orders')}</TabsTrigger>
                    <TabsTrigger value="invoices">{t('Invoices')}</TabsTrigger>
                    <TabsTrigger value="billin">{t('Billing Details')}</TabsTrigger>
                    <TabsTrigger value="reviews">{t('Reviews')}</TabsTrigger>
                    <TabsTrigger value="activity">{t('Activity')}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview">
                    <CustomerDetailsOverviews customer={customer} orders={orders} />
                  </TabsContent>
                  <TabsContent value="account">
                    <CustomerDetailsAccount customer={customer} />
                  </TabsContent>
                  <TabsContent value="orders">
                    <CustomerDetailsOrders customer={customer} orders={detailsOrders} />
                  </TabsContent>
                  <TabsContent value="invoices">
                    <CustomerDetailsInvoice invoices={invoices} />
                  </TabsContent>
                  <TabsContent value="billin">
                    <CustomerDetailsBilling customer={customer} />
                  </TabsContent>
                  <TabsContent value="reviews">
                    <CustomerDetailsReviews reviews={customer?.reviews} />
                  </TabsContent>
                  <TabsContent value="activity">
                    <CustomerDetailsActivity customer={customer} orders={orders} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </ScrollArea>
        </SheetBody>

        <SheetFooter className="flex-row border-t pb-4 p-5 border-border gap-2.5 lg:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('Close')}</Button>
          <Button variant="outline" asChild disabled={!email}>
            <a href={email ? `mailto:${email}` : undefined}>{t('Send Email')}</a>
          </Button>
          <Button variant="mono" onClick={onEditClick} disabled={!customer}>{t('Edit Details')}</Button>
          <Button variant="outline" onClick={onDepositClick} disabled={!customer}>{t('Deposit')}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

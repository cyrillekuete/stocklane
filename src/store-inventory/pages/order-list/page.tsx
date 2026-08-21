'use client';

import { useMemo, useRef, useState } from 'react';
import { addDays, format } from 'date-fns';
import { ChevronDown, PlusIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useT } from '@/i18n/use-t';
import { allOrderListMockData } from '@/store-inventory/data/orders';
import { useOrders } from '@/store-inventory/hooks/use-inventory';
import { parseOrderDate } from '@/store-inventory/lib/format';
import { OrderFormSheet } from '../components/order-form-sheet';
import { OrderListTable } from '../tables/order-list';

function inDateRange(value: string, range?: DateRange) {
  if (!range?.from) return true;
  const parsed = parseOrderDate(value);
  if (!parsed) return false;
  const start = new Date(range.from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(range.to ?? range.from);
  end.setHours(23, 59, 59, 999);
  return parsed >= start && parsed <= end;
}

export function OrderList() {
  const t = useT();
  const { data, isLoading, isError } = useOrders();
  const orders = isSupabaseConfigured ? (data ?? []) : (data ?? allOrderListMockData);
  const today = new Date();
  const defaultDateRange: DateRange = {
    from: addDays(today, -800),
    to: today,
  };
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultDateRange);
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(defaultDateRange);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const isApplyingRef = useRef(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filteredOrders = useMemo(
    () => orders.filter((order) => inDateRange(order.date, dateRange)),
    [orders, dateRange],
  );

  const summary = useMemo(() => {
    const total = filteredOrders.length;
    const attention = filteredOrders.filter((order) =>
      ['On Hold', 'Pending', 'Failed'].includes(order.deliveryStatus.label) ||
      ['Pending', 'Failed', 'Unpaid'].includes(order.paymentStatus.label),
    ).length;
    return { total, attention };
  }, [filteredOrders]);

  const handleDateRangeApply = () => {
    isApplyingRef.current = true;
    if (tempDateRange) setDateRange(tempDateRange);
    setIsDatePickerOpen(false);
    setTimeout(() => {
      isApplyingRef.current = false;
    }, 100);
  };

  const handleDateRangeReset = () => {
    isApplyingRef.current = true;
    setTempDateRange(defaultDateRange);
    setDateRange(defaultDateRange);
    setIsDatePickerOpen(false);
    setTimeout(() => {
      isApplyingRef.current = false;
    }, 100);
  };

  const handleDateRangeCancel = () => {
    isApplyingRef.current = true;
    setTempDateRange(dateRange);
    setIsDatePickerOpen(false);
    setTimeout(() => {
      isApplyingRef.current = false;
    }, 100);
  };

  return (
    <div className="container-fluid space-y-5 lg:space-y-9">
      <div className="flex items-center flex-wrap gap-2 justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground">{t('Order List')}</h1>
          <span className="text-sm text-muted-foreground">
            {t('{total} orders found. {attention} orders need your attention.', {
              total: summary.total,
              attention: summary.attention,
            })}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Popover
            open={isDatePickerOpen}
            onOpenChange={(open) => {
              if (open) {
                setTempDateRange(dateRange);
                setIsDatePickerOpen(open);
              } else if (!isApplyingRef.current) {
                setTempDateRange(dateRange);
                setIsDatePickerOpen(open);
              }
            }}
          >
            <PopoverTrigger asChild>
              <Button type="button" variant="outline">
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
                    </>
                  ) : (
                    format(dateRange.from, 'MMM dd, yyyy')
                  )
                ) : (
                  <span>{t('All dates')}</span>
                )}
                <ChevronDown className="size-4 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                autoFocus
                mode="range"
                defaultMonth={tempDateRange?.from || dateRange?.from}
                showOutsideDays={false}
                selected={tempDateRange}
                onSelect={(selected) =>
                  setTempDateRange({
                    from: selected?.from || undefined,
                    to: selected?.to || undefined,
                  })
                }
                numberOfMonths={2}
              />
              <div className="flex items-center justify-between border-t border-border p-3">
                <Button variant="outline" onClick={handleDateRangeReset}>{t('Reset')}</Button>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" onClick={handleDateRangeCancel}>{t('Cancel')}</Button>
                  <Button onClick={handleDateRangeApply}>{t('Apply')}</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="mono" onClick={() => setIsCreateOpen(true)}>
            <PlusIcon />
            {t('New Order')}
          </Button>
        </div>
      </div>

      <OrderListTable
        mockData={filteredOrders}
        isLoading={isLoading}
        isError={isError}
      />

      <OrderFormSheet
        mode="new"
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
    </div>
  );
}

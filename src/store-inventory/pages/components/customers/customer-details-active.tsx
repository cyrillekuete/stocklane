'use client';

import { CalendarPlus, ShoppingBag, UserRound } from 'lucide-react';
import { useT } from '@/i18n/use-t';
import { TimelineItem } from './components/activity/timeline-item';
import type { CustomerListRow, OrderListRow } from '@/store-inventory/types';

export function CustomerDetailsActivity({
  customer,
  orders = [],
}: {
  customer?: CustomerListRow;
  orders?: OrderListRow[];
}) {
  const t = useT();
  const events = [
    {
      icon: UserRound,
      title: t('{name} joined the store', { name: customer?.customerInfo.title || t('Customer') }),
      time: customer?.joined || customer?.updated || '—',
    },
    {
      icon: CalendarPlus,
      title: t('Profile last updated'),
      time: customer?.updated || '—',
    },
    ...orders.slice(0, 6).map((order) => ({
      icon: ShoppingBag,
      title: t('Placed order {order} for {total}', { order: order.order, total: order.total }),
      time: order.date,
    })),
  ];

  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <TimelineItem key={`${event.title}-${index}`} icon={event.icon} className="text-primary" line={index < events.length - 1}>
          <div className="flex flex-col">
            <div className="text-sm text-foreground font-normal">{event.title}</div>
            <span className="text-xs text-muted-foreground/80 font-normal">{event.time}</span>
          </div>
        </TimelineItem>
      ))}
    </div>
  );
}

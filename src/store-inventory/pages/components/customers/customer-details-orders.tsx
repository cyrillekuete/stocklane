'use client';

import { Statistics2 } from './components/statistics2';
import { DetailsOrdersTable } from '../../tables/details-orders';
import type { CustomerListRow, DetailsOrdersRow } from '@/store-inventory/types';

export function CustomerDetailsOrders({
  customer,
  orders = [],
}: {
  customer?: CustomerListRow;
  orders?: DetailsOrdersRow[];
}) {
  const total = Number(customer?.created || orders.length || 0);
  const delivered = orders.filter(
    (order) => order.deliveryStatus.label.toLowerCase() === 'delivered',
  ).length;
  const inProgress = orders.filter((order) => {
    const delivery = order.deliveryStatus.label.toLowerCase();
    return delivery !== 'delivered' && delivery !== 'canceled' && delivery !== 'cancelled' && delivery !== 'returned';
  }).length;
  const returns = orders.filter((order) => order.deliveryStatus.label.toLowerCase() === 'returned').length;

  return (
    <div className="space-y-5">
      <Statistics2
        items={[
          { total: String(total), label: 'Total Orders' },
          { total: String(inProgress), label: 'In Progress' },
          { total: String(delivered), label: 'Delivered Orders' },
          { total: String(returns), label: 'Returns' },
        ]}
      />
      <DetailsOrdersTable mockData={orders as never} />
    </div>
  );
}

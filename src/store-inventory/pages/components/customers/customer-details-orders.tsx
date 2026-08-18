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
  const delivered = orders.filter((order) => order.paymentStatus.label.toLowerCase() === 'paid').length;
  const inProgress = orders.filter((order) => order.paymentStatus.label.toLowerCase() !== 'paid').length;

  return (
    <div className="space-y-5">
      <Statistics2
        items={[
          { total: String(total), label: 'Total Orders' },
          { total: String(inProgress), label: 'In Progress' },
          { total: String(delivered), label: 'Delivered Orders' },
          { total: '0', label: 'Returns' },
        ]}
      />
      <DetailsOrdersTable mockData={orders as never} />
    </div>
  );
}

'use client';

import { parseMoney, formatMoney } from '@/store-inventory/lib/format';
import { Statistics1 } from './components/statistics1';
import { RecentOrders } from './components/resent-order';
import { LoyaltyTier } from './components/loyalty-tier';
import type { CustomerListRow, OrderListRow } from '@/store-inventory/types';

export function CustomerDetailsOverviews({
  customer,
  orders = [],
}: {
  customer?: CustomerListRow;
  orders?: OrderListRow[];
}) {
  const orderCount = Number(customer?.created || orders.length || 0);
  const spent = parseMoney(customer?.total);
  const avg = parseMoney(customer?.price);
  const accountBalance = customer?.accountBalance ?? 0;

  return (
    <div className="space-y-5">
      <Statistics1
        items={[
          { total: orderCount.toLocaleString(), label: 'Total Orders', badgeLabel: '23.08', badgeColor: 'success', text: 'Annual trend', icon: 'up' },
          { total: customer?.total || '$0.00', label: 'Cumulative Spend', badgeLabel: '3.82', badgeColor: 'success', text: 'Monthly trend', icon: 'up' },
          { total: customer?.price || '$0.00', label: 'Avg. Order Value(AOV)', badgeLabel: '0.39', badgeColor: avg >= spent / Math.max(orderCount, 1) ? 'success' : 'destructive', text: 'Weekly trend', icon: avg >= 50 ? 'up' : 'down' },
          {
            total: formatMoney(accountBalance),
            label: 'Account Balance',
            badgeLabel: '0',
            badgeColor: accountBalance < 0 ? 'destructive' : 'success',
            text: accountBalance < 0 ? 'Customer owes the shop' : 'Available credit',
            icon: accountBalance < 0 ? 'down' : 'up',
            valueClassName: accountBalance < 0 ? 'text-destructive' : 'text-foreground',
          },
        ]}
      />
      <div className="grid lg:grid-cols-2 gap-5 items-stretch">
        <RecentOrders orders={orders} average={avg} />
        <LoyaltyTier points={Math.round(spent)} />
      </div>
    </div>
  );
}

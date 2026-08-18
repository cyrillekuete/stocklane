'use client';

import { parseMoney } from '@/store-inventory/lib/format';
import { Statistics3 } from './components/statistics3';
import { BillingDetails } from './components/billing-details';
import { PaymentMethods } from './components/payment-methods';
import type { CustomerListRow } from '@/store-inventory/types';

export function CustomerDetailsBilling({ customer }: { customer?: CustomerListRow }) {
  const spent = parseMoney(customer?.total);
  const plan = spent >= 5000 ? 'VIP Plan' : spent >= 2500 ? 'Prime Plan' : spent >= 1000 ? 'Plus Plan' : 'Lite Plan';

  return (
    <div className="space-y-5">
      <Statistics3
        items={[
          { total: plan, label: 'Good for Startups & Individuals' },
          { total: customer?.total || '$0.00', label: 'Annual Fee' },
          { total: customer?.price || '$0.00', label: 'Next Bill Amount' },
          { total: customer?.updated || '—', label: 'Next Bill Date' },
        ]}
      />
      <div className="grid lg:grid-cols-2 gap-5 items-stretch">
        <BillingDetails customer={customer} />
        <PaymentMethods methods={customer?.paymentMethods} customerName={customer?.customerInfo.title} />
      </div>
    </div>
  );
}

'use client';

import { Statistics4 } from './components/statistics4';
import { DetailsInvoiceTable } from '../../tables/details-invoice';
import type { DetailsInvoiceRow } from '@/store-inventory/types';

export function CustomerDetailsInvoice({ invoices = [] }: { invoices?: DetailsInvoiceRow[] }) {
  const paid = invoices.filter((invoice) => invoice.paymentStatus.label.toLowerCase() === 'paid').length;
  const unpaid = invoices.length - paid;

  return (
    <div className="space-y-5">
      <Statistics4
        items={[
          { total: String(invoices.length), label: 'Total Invoices' },
          { total: String(paid), label: 'Paid Invoices' },
          { total: String(unpaid), label: 'Unpaid Invoices' },
          { total: '0', label: 'Overdue Invoices' },
        ]}
      />
      <DetailsInvoiceTable mockData={invoices as never} />
    </div>
  );
}

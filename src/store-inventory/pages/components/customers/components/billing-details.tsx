'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { CustomerListRow } from '@/store-inventory/types';

export function BillingDetails({ customer }: { customer?: CustomerListRow }) {
  const item = [
    { label: 'Company Name', info: customer?.company || '—' },
    { label: 'Address', info: customer?.billingAddress || customer?.location.name || '—' },
    { label: 'Contact', info: customer?.customerInfo.title || '—' },
    { label: 'VAT ID', info: customer?.vatId || '—' },
  ];

  return (
    <Card className="bg-accent/70 rounded-md shadow-none h-full flex flex-col">
      <CardContent className="p-0 flex flex-col h-full">
        <h3 className="text-sm font-medium text-foreground py-2.5 ps-2">Billing Details</h3>
        <div className="bg-background rounded-md m-1 mt-0 border border-input py-6 px-3.5 space-y-5 h-full">
          {item.map((row) => (
            <div key={row.label} className="flex gap-2 lg:gap-10">
              <span className="basis-1/4 text-xs font-normal text-secondary-foreground/80 leading-6">{row.label}</span>
              <span className="basis-2/4 text-2sm font-normal text-foreground leading-6">{row.info}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

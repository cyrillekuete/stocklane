'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useT } from '@/i18n/use-t';
import { useCustomers } from '@/store-inventory/hooks/use-inventory';
import { isSupabaseConfigured } from '@/lib/supabase';
import { customerListMockData } from '@/store-inventory/data/customers';
import { CustomerListTable } from '../tables/customer-list';
import type { CustomerListRow } from '@/store-inventory/types';

const EMPTY_CUSTOMERS: CustomerListRow[] = [];

export function CustomerListDetails() {
  const t = useT();
  const [searchParams] = useSearchParams();
  const { data, isLoading, isError } = useCustomers();
  const customers = isSupabaseConfigured ? (data ?? EMPTY_CUSTOMERS) : (data ?? customerListMockData);
  const selectedCustomerId = searchParams.get('id') ?? undefined;

  const summary = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((customer) => customer.status.label.toLowerCase() === 'active').length;
    const activePct = total ? Math.round((active / total) * 100) : 0;
    return { total, activePct };
  }, [customers]);

  return (
    <div className="container-fluid space-y-5 lg:space-y-9">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-foreground">{t('Customer Details')}</h1>
        <span className="text-sm text-muted-foreground">
          {summary.total === 1
            ? t('{count} customer found. {pct}% are active. Select a customer to view profile, orders, and billing.', {
                count: summary.total,
                pct: summary.activePct,
              })
            : t('{count} customers found. {pct}% are active. Select a customer to view profile, orders, and billing.', {
                count: summary.total,
                pct: summary.activePct,
              })}
        </span>
      </div>
      <CustomerListTable
        mockData={customers}
        isLoading={isLoading}
        isError={isError}
        displaySheet="customerDetails"
        selectedCustomerId={selectedCustomerId}
      />
    </div>
  );
}

'use client';

import { format } from 'date-fns';
import { useT } from '@/i18n/use-t';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCustomerAccountTransactions } from '@/store-inventory/hooks/use-customer-accounts';
import { formatMoney } from '@/store-inventory/lib/format';
import { formatPaymentMethod } from '@/store-inventory/lib/payment-methods';
import { cn } from '@/lib/utils';
import type { CustomerAccountTransaction, CustomerAccountTransactionType, CustomerListRow } from '@/store-inventory/types';
import { Statistics2 } from './components/statistics2';

const TYPE_LABELS: Record<CustomerAccountTransactionType, string> = {
  deposit: 'Deposit',
  sale: 'Sale',
  void: 'Void',
};

function typeLabel(row: CustomerAccountTransaction) {
  if (row.type === 'sale' && row.paymentMethod === 'credit') return 'Credit';
  if (row.type === 'sale' && row.paymentMethod === 'account') return 'Account';
  return TYPE_LABELS[row.type];
}

function typeVariant(row: CustomerAccountTransaction): 'success' | 'secondary' | 'warning' {
  if (row.type === 'deposit') return 'success';
  if (row.type === 'void') return 'warning';
  if (row.paymentMethod === 'credit') return 'warning';
  return 'secondary';
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, 'd MMM yyyy, HH:mm');
}

export function CustomerDetailsAccount({ customer }: { customer?: CustomerListRow }) {
  const t = useT();
  const { data = [], isLoading, isError } = useCustomerAccountTransactions(
    isSupabaseConfigured ? customer?.id : undefined,
  );
  const balance = customer?.accountBalance ?? 0;
  const deposits = data.filter((row) => row.type === 'deposit').reduce((sum, row) => sum + row.amount, 0);
  const accountCharges = data
    .filter((row) => row.type === 'sale' && row.paymentMethod !== 'credit')
    .reduce((sum, row) => sum + Math.abs(row.amount), 0);
  const creditCharges = data
    .filter((row) => row.type === 'sale' && row.paymentMethod === 'credit')
    .reduce((sum, row) => sum + Math.abs(row.amount), 0);

  return (
    <div className="space-y-5">
      <Statistics2
        items={[
          { total: formatMoney(balance), label: 'Account Balance', valueClassName: balance < 0 ? 'text-destructive' : undefined },
          { total: formatMoney(deposits), label: 'Total Deposits' },
          { total: formatMoney(accountCharges), label: 'Paid from Account' },
          { total: formatMoney(creditCharges), label: 'Bought on Credit' },
        ]}
      />
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">{t('Account activity')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isError && (
            <p className="px-5 py-6 text-sm text-destructive">{t('Unable to load account activity.')}</p>
          )}
          {isLoading && <p className="px-5 py-6 text-sm text-muted-foreground">{t('Loading account activity...')}</p>}
          {!isLoading && !isError && data.length === 0 && (
            <p className="px-5 py-6 text-sm text-muted-foreground">{t('No deposits or account charges yet.')}</p>
          )}
          {data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-y border-border bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-5 py-2.5 text-start font-medium">{t('Date')}</th>
                    <th className="px-5 py-2.5 text-start font-medium">{t('Type')}</th>
                    <th className="px-5 py-2.5 text-start font-medium">{t('Method')}</th>
                    <th className="px-5 py-2.5 text-start font-medium">{t('Reference')}</th>
                    <th className="px-5 py-2.5 text-end font-medium">{t('Amount')}</th>
                    <th className="px-5 py-2.5 text-end font-medium">{t('Balance')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <TransactionRow key={row.id} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TransactionRow({ row }: { row: CustomerAccountTransaction }) {
  const t = useT();
  const reference = row.posSaleNumber || row.notes || '—';
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-5 py-3 whitespace-nowrap">{formatDate(row.createdAt)}</td>
      <td className="px-5 py-3">
        <Badge variant={typeVariant(row)} appearance="light">
          {t(typeLabel(row))}
        </Badge>
      </td>
      <td className="px-5 py-3">{t(formatPaymentMethod(row.paymentMethod))}</td>
      <td className="px-5 py-3">{reference}</td>
      <td
        className={cn(
          'px-5 py-3 text-end font-medium',
          row.amount < 0 ? 'text-destructive' : 'text-foreground',
        )}
      >
        {row.amount > 0 ? '+' : ''}
        {formatMoney(row.amount)}
      </td>
      <td className={cn('px-5 py-3 text-end', row.balanceAfter < 0 && 'text-destructive')}>
        {formatMoney(row.balanceAfter)}
      </td>
    </tr>
  );
}

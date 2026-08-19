import { supabase } from '@/lib/supabase';
import { parseMoney } from '../lib/format';
import type { CustomerAccountTransaction, CustomerAccountTransactionType, PosPaymentMethod } from '../types';

export type DepositPaymentMethod = Exclude<PosPaymentMethod, 'credit' | 'account'>;

export type DepositCustomerAccountInput = {
  customerId: string;
  amount: number;
  paymentMethod: DepositPaymentMethod;
  notes?: string;
};

type AccountTransactionDbRow = {
  id: string;
  customer_id: string;
  type: string;
  amount: number | string;
  balance_after: number | string;
  payment_method: string | null;
  notes: string | null;
  pos_sale_id: string | null;
  created_at: string;
  pos_sale?: { id: string; sale_number: string } | null;
};

function requireClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  return supabase;
}

function mapTransaction(row: AccountTransactionDbRow): CustomerAccountTransaction {
  return {
    id: row.id,
    customerId: row.customer_id,
    type: (row.type as CustomerAccountTransactionType) ?? 'deposit',
    amount: parseMoney(row.amount),
    balanceAfter: parseMoney(row.balance_after),
    paymentMethod: row.payment_method,
    notes: row.notes,
    posSaleId: row.pos_sale_id,
    posSaleNumber: row.pos_sale?.sale_number ?? null,
    createdAt: row.created_at,
  };
}

export async function fetchCustomerAccountTransactions(customerId: string) {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_customer_account_transactions')
    .select('*, pos_sale:inventory_pos_sales(id, sale_number)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as AccountTransactionDbRow[]).map(mapTransaction);
}

export async function depositCustomerAccount(input: DepositCustomerAccountInput) {
  const client = requireClient();
  const { data, error } = await client.rpc('inventory_deposit_customer_account', {
    payload: {
      customer_id: input.customerId,
      amount: input.amount,
      payment_method: input.paymentMethod,
      notes: input.notes ?? '',
    },
  });
  if (error) throw error;
  const result = data as { id?: string; customer_id?: string; account_balance?: number } | null;
  return {
    id: result?.id ?? '',
    customerId: result?.customer_id ?? input.customerId,
    accountBalance: parseMoney(result?.account_balance ?? input.amount),
  };
}

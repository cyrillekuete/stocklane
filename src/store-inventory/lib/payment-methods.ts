import type { PosPaymentMethod } from '@/store-inventory/types';

export const POS_PAYMENT_METHODS: { value: PosPaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'account', label: 'Account' },
  { value: 'credit', label: 'Credit' },
  { value: 'mtn_mobile_money', label: 'MTN Mobile Money' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
];

export const DEPOSIT_PAYMENT_METHODS = POS_PAYMENT_METHODS.filter(
  (method) => method.value !== 'credit' && method.value !== 'account',
);

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  account: 'Account',
  credit: 'Credit',
  mtn_mobile_money: 'MTN Mobile Money',
  orange_money: 'Orange Money',
  bank_transfer: 'Bank Transfer',
  card: 'Card',
  mobile: 'Mobile',
};

export function isCustomerAccountPayment(value?: string | null) {
  return value === 'account' || value === 'credit';
}

export function formatPaymentMethod(value?: string | null) {
  if (!value) return 'Cash';
  return (
    PAYMENT_METHOD_LABELS[value] ??
    value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

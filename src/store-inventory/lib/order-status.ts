/** Canonical order payment / delivery statuses and transition rules. */

export const ORDER_PAYMENT_STATUSES = [
  'Paid',
  'Pending',
  'Unpaid',
  'Failed',
  'Cancelled',
] as const;

export const ORDER_DELIVERY_STATUSES = [
  'Pending',
  'Packed',
  'Shipped',
  'Delivered',
  'On Hold',
  'Canceled',
  'Returned',
] as const;

export type OrderPaymentStatus = (typeof ORDER_PAYMENT_STATUSES)[number];
export type OrderDeliveryStatus = (typeof ORDER_DELIVERY_STATUSES)[number];

const PAYMENT_ALIASES: Record<string, OrderPaymentStatus> = {
  paid: 'Paid',
  pending: 'Pending',
  unpaid: 'Unpaid',
  failed: 'Failed',
  cancelled: 'Cancelled',
  canceled: 'Cancelled',
};

const DELIVERY_ALIASES: Record<string, OrderDeliveryStatus> = {
  pending: 'Pending',
  packed: 'Packed',
  shipped: 'Shipped',
  shipping: 'Shipped',
  'in transit': 'Shipped',
  delivered: 'Delivered',
  'on hold': 'On Hold',
  canceled: 'Canceled',
  cancelled: 'Canceled',
  returned: 'Returned',
};

const PAYMENT_TRANSITIONS: Record<OrderPaymentStatus, OrderPaymentStatus[]> = {
  Unpaid: ['Pending', 'Paid', 'Failed', 'Cancelled'],
  Pending: ['Unpaid', 'Paid', 'Failed', 'Cancelled'],
  Paid: ['Cancelled'],
  Failed: ['Unpaid', 'Pending', 'Paid', 'Cancelled'],
  Cancelled: [],
};

const DELIVERY_TRANSITIONS: Record<OrderDeliveryStatus, OrderDeliveryStatus[]> = {
  Pending: ['Packed', 'Shipped', 'Delivered', 'On Hold', 'Canceled'],
  Packed: ['Pending', 'Shipped', 'Delivered', 'On Hold', 'Canceled'],
  Shipped: ['Delivered', 'Returned', 'Canceled'],
  Delivered: ['Returned'],
  'On Hold': ['Pending', 'Packed', 'Shipped', 'Canceled'],
  Canceled: [],
  Returned: [],
};

export function normalizePaymentStatus(value?: string | null): OrderPaymentStatus {
  const key = (value ?? '').trim().toLowerCase();
  return PAYMENT_ALIASES[key] ?? 'Unpaid';
}

export function normalizeDeliveryStatus(value?: string | null): OrderDeliveryStatus {
  const key = (value ?? '').trim().toLowerCase();
  return DELIVERY_ALIASES[key] ?? 'Pending';
}

export function isCanceledDelivery(status?: string | null) {
  return normalizeDeliveryStatus(status) === 'Canceled';
}

export function isFulfilledDelivery(status?: string | null) {
  const normalized = normalizeDeliveryStatus(status);
  return normalized === 'Delivered' || normalized === 'Shipped';
}

export function isReturnedDelivery(status?: string | null) {
  return normalizeDeliveryStatus(status) === 'Returned';
}

export function canTransitionPayment(from: string, to: string) {
  const current = normalizePaymentStatus(from);
  const next = normalizePaymentStatus(to);
  if (current === next) return true;
  return PAYMENT_TRANSITIONS[current].includes(next);
}

export function canTransitionDelivery(from: string, to: string) {
  const current = normalizeDeliveryStatus(from);
  const next = normalizeDeliveryStatus(to);
  if (current === next) return true;
  return DELIVERY_TRANSITIONS[current].includes(next);
}

export function deliveryStep(status?: string | null) {
  const normalized = normalizeDeliveryStatus(status);
  if (normalized === 'Delivered') return 4;
  if (normalized === 'Shipped') return 3;
  if (normalized === 'Packed') return 2;
  return 1;
}

export function assertPaymentTransition(from: string, to: string) {
  if (!canTransitionPayment(from, to)) {
    throw new Error(`Invalid payment status transition: ${from} → ${to}`);
  }
}

export function assertDeliveryTransition(from: string, to: string) {
  if (!canTransitionDelivery(from, to)) {
    throw new Error(`Invalid delivery status transition: ${from} → ${to}`);
  }
}

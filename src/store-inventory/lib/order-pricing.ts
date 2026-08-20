import { roundMoney } from './format';

export type OrderPricingItem = {
  price: number;
  quantity?: number;
};

export type OrderPricingOptions = {
  taxPercent?: number;
  taxCalculation?: 'inclusive' | 'exclusive' | string;
  freeShippingEnabled?: boolean;
  freeShippingMin?: number;
  /** Flat shipping when free-shipping threshold is not met. */
  shippingFlat?: number;
};

export type OrderPricingResult = {
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
};

export function computeOrderPricing(
  items: OrderPricingItem[] = [],
  options: OrderPricingOptions = {},
): OrderPricingResult {
  if (!items.length) {
    return { subtotal: 0, shippingCost: 0, tax: 0, total: 0 };
  }

  const subtotal = roundMoney(
    items.reduce((sum, item) => {
      const qty = Math.max(Math.trunc(item.quantity ?? 1), 0);
      return sum + roundMoney(item.price) * qty;
    }, 0),
  );

  const shippingFlat = roundMoney(options.shippingFlat ?? 10);
  const freeShippingEnabled = options.freeShippingEnabled ?? true;
  const freeShippingMin = roundMoney(options.freeShippingMin ?? 0);
  const shippingCost =
    freeShippingEnabled && subtotal >= freeShippingMin ? 0 : shippingFlat;

  const taxPercent = Math.min(Math.max(Number(options.taxPercent ?? 0), 0), 100);
  const inclusive = (options.taxCalculation ?? 'exclusive') === 'inclusive';
  // Tax applies to merchandise subtotal (not shipping), matching POS merchandise tax.
  const tax = roundMoney(
    taxPercent <= 0
      ? 0
      : inclusive
        ? subtotal - subtotal / (1 + taxPercent / 100)
        : (subtotal * taxPercent) / 100,
  );

  const total = inclusive
    ? roundMoney(subtotal + shippingCost)
    : roundMoney(subtotal + shippingCost + tax);

  return { subtotal, shippingCost, tax, total };
}

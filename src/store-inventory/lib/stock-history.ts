import type { StockHistoryRow } from '../types';

export type StockHistoryProductInput = {
  id: string;
  name: string;
  sku: string;
  unitPrice: number;
  currentQty: number;
};

export type StockHistoryMovementInput = {
  productId: string;
  delta: number;
  reason: string;
  createdAt: string;
};

type MovementBucket = 'purchased' | 'sold' | 'adjustment' | 'ignore';

export function classifyStockMovementReason(reason: string, delta: number): MovementBucket {
  switch (reason) {
    case 'inbound_receive':
      return 'purchased';
    case 'initial_stock':
      return 'ignore';
    case 'pos_sale':
    case 'pos_void':
    case 'fulfill':
      return 'sold';
    case 'reserve':
    case 'release':
      return delta === 0 ? 'ignore' : 'adjustment';
    default:
      return 'adjustment';
  }
}

function amt(qty: number, unitPrice: number) {
  return qty * unitPrice;
}

export function aggregateStockHistory(input: {
  products: StockHistoryProductInput[];
  movements: StockHistoryMovementInput[];
  rangeStart: Date;
  rangeEnd: Date;
}): StockHistoryRow[] {
  const rangeStartMs = input.rangeStart.getTime();
  const rangeEndMs = input.rangeEnd.getTime();
  const products = new Map(input.products.map((product) => [product.id, product]));

  const afterEndByProduct = new Map<string, number>();
  const bucketsByProduct = new Map<
    string,
    { purchased: number; sold: number; adjustment: number; hadMovement: boolean }
  >();

  const ensureBuckets = (productId: string) => {
    const existing = bucketsByProduct.get(productId);
    if (existing) return existing;
    const created = { purchased: 0, sold: 0, adjustment: 0, hadMovement: false };
    bucketsByProduct.set(productId, created);
    return created;
  };

  for (const movement of input.movements) {
    const createdAt = new Date(movement.createdAt).getTime();
    if (Number.isNaN(createdAt)) continue;
    const delta = Number(movement.delta) || 0;

    if (createdAt > rangeEndMs) {
      afterEndByProduct.set(
        movement.productId,
        (afterEndByProduct.get(movement.productId) ?? 0) + delta,
      );
      continue;
    }

    if (createdAt < rangeStartMs) continue;

    const buckets = ensureBuckets(movement.productId);
    buckets.hadMovement = true;
    const bucket = classifyStockMovementReason(movement.reason, delta);
    switch (bucket) {
      case 'purchased':
        buckets.purchased += delta;
        break;
      case 'sold':
        buckets.sold += delta;
        break;
      case 'adjustment':
        buckets.adjustment += delta;
        break;
      case 'ignore':
        break;
      default: {
        const _exhaustive: never = bucket;
        throw new Error(`Unhandled movement bucket: ${String(_exhaustive)}`);
      }
    }
  }

  const rows: StockHistoryRow[] = [];
  const seen = new Set<string>();

  const pushRow = (product: StockHistoryProductInput) => {
    if (seen.has(product.id)) return;
    seen.add(product.id);
    const buckets = bucketsByProduct.get(product.id) ?? {
      purchased: 0,
      sold: 0,
      adjustment: 0,
      hadMovement: false,
    };
    const afterEnd = afterEndByProduct.get(product.id) ?? 0;
    const inRangeDelta = buckets.purchased + buckets.sold + buckets.adjustment;
    const finalQty = product.currentQty - afterEnd;
    const initialQty = finalQty - inRangeDelta;
    if (
      !buckets.hadMovement &&
      initialQty === 0 &&
      finalQty === 0 &&
      buckets.purchased === 0 &&
      buckets.sold === 0 &&
      buckets.adjustment === 0
    ) {
      return;
    }
    const unitPrice = product.unitPrice;
    rows.push({
      id: product.id,
      item: product.name,
      sku: product.sku,
      unitPrice,
      initialQty,
      purchasedQty: buckets.purchased,
      soldQty: buckets.sold,
      adjustmentQty: buckets.adjustment,
      finalQty,
      initialAmt: amt(initialQty, unitPrice),
      purchasedAmt: amt(buckets.purchased, unitPrice),
      soldAmt: amt(buckets.sold, unitPrice),
      finalAmt: amt(finalQty, unitPrice),
    });
  };

  for (const product of input.products) {
    pushRow(product);
  }

  for (const productId of bucketsByProduct.keys()) {
    if (seen.has(productId)) continue;
    const orphan = products.get(productId);
    if (orphan) pushRow(orphan);
  }

  return rows.sort((a, b) => a.item.localeCompare(b.item, undefined, { sensitivity: 'base' }));
}

export function formatSignedQty(qty: number, style: 'unsigned' | 'plus' | 'signed') {
  if (style === 'unsigned') return String(qty);
  if (qty === 0) return style === 'plus' ? '+0' : '0';
  if (qty > 0) return `+${qty}`;
  return String(qty);
}

export function formatHistoryNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

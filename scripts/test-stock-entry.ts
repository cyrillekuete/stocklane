/**
 * Guards stock-entry qty parsing and history classification for initial stock.
 * Run: npm run test:stock-entry
 */
import assert from 'node:assert/strict';
import {
  defaultStockEntryQty,
  parseStockEntryQty,
  stockEntrySubmitLabel,
} from '../src/store-inventory/lib/stock-entry';
import {
  aggregateStockHistory,
  classifyStockMovementReason,
} from '../src/store-inventory/lib/stock-history';

assert.equal(parseStockEntryQty('purchased', '4'), 4);
assert.equal(parseStockEntryQty('purchased', '0'), null);
assert.equal(parseStockEntryQty('purchased', '-1'), null);
assert.equal(parseStockEntryQty('initial', '1.9'), 1);
assert.equal(parseStockEntryQty('adjustment', '-3'), -3);
assert.equal(parseStockEntryQty('adjustment', '2'), 2);
assert.equal(parseStockEntryQty('adjustment', '0'), null);
assert.equal(parseStockEntryQty('adjustment', ''), null);
assert.equal(defaultStockEntryQty('purchased'), '1');
assert.equal(defaultStockEntryQty('adjustment'), '');
assert.equal(stockEntrySubmitLabel('purchased'), 'Receive');

assert.equal(classifyStockMovementReason('inbound_receive', 5), 'purchased');
assert.equal(classifyStockMovementReason('initial_stock', 12), 'ignore');
assert.equal(classifyStockMovementReason('adjustment', -2), 'adjustment');

const now = new Date('2026-09-06T12:00:00.000Z');
const rows = aggregateStockHistory({
  products: [{ id: 'p1', name: 'Widget', sku: 'W-1', unitPrice: 10, currentQty: 100 }],
  movements: [
    {
      productId: 'p1',
      delta: 100,
      reason: 'initial_stock',
      createdAt: '2026-09-06T11:00:00.000Z',
    },
  ],
  rangeStart: new Date('2026-09-06T00:00:00.000Z'),
  rangeEnd: now,
});

assert.equal(rows.length, 1);
assert.equal(rows[0]?.purchasedQty, 0);
assert.equal(rows[0]?.adjustmentQty, 0);
assert.equal(rows[0]?.initialQty, 100);
assert.equal(rows[0]?.finalQty, 100);

console.log('test-stock-entry: ok');

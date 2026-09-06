import assert from 'node:assert/strict';
import {
  overlayWarehouseStockLevel,
  stockDeltaFromQty,
} from '../src/store-inventory/lib/stock-delta';

assert.deepEqual(stockDeltaFromQty(90, 1), { label: '+89', variant: 'success' });
assert.deepEqual(stockDeltaFromQty(11, 250), { label: '-239', variant: 'destructive' });
assert.deepEqual(stockDeltaFromQty(40, 40), { label: '0', variant: 'secondary' });

const withoutLevel = overlayWarehouseStockLevel(null, 90, 2);
assert.equal(withoutLevel.qty, 90);
assert.equal(withoutLevel.reserved, 2);
assert.equal(withoutLevel.delta_label, '+90');
assert.equal(withoutLevel.delta_variant, 'success');

const withLevel = overlayWarehouseStockLevel(
  { threshold: 250, qty: 40, reserved: 1, delta_label: '0', delta_variant: 'secondary' },
  11,
  0,
);
assert.equal(withLevel.qty, 11);
assert.equal(withLevel.reserved, 0);
assert.equal(withLevel.threshold, 250);
assert.equal(withLevel.delta_label, '-239');
assert.equal(withLevel.delta_variant, 'destructive');

console.log('stock-delta checks passed');

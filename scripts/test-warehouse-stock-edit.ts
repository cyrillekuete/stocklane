import assert from 'node:assert/strict';
import { resolveProductWarehouseStock } from '../src/store-inventory/lib/warehouse-stock-edit';

const productId = 'prod-1';
const warehouseA = [
  { productId, qty: 5, reserved: 0 },
  { productId: 'other', qty: 1, reserved: 0 },
];
const warehouseB = [{ productId, qty: 5, reserved: 2 }];

// WH-A snapshot must not inherit reserved from a WH-B table overlay.
const fromA = resolveProductWarehouseStock(warehouseA, productId);
assert.equal(fromA.qty, 5);
assert.equal(fromA.reserved, 0);

const fromB = resolveProductWarehouseStock(warehouseB, productId);
assert.equal(fromB.qty, 5);
assert.equal(fromB.reserved, 2);

assert.deepEqual(resolveProductWarehouseStock([], productId), { qty: 0, reserved: 0 });
assert.deepEqual(resolveProductWarehouseStock(warehouseA, 'missing'), {
  qty: 0,
  reserved: 0,
});

console.log('warehouse-stock-edit checks passed');

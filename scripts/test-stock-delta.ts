import assert from 'node:assert/strict';
import { stockDeltaFromQty } from '../src/store-inventory/lib/stock-delta';

assert.deepEqual(stockDeltaFromQty(90, 1), { label: '+89', variant: 'success' });
assert.deepEqual(stockDeltaFromQty(11, 250), { label: '-239', variant: 'destructive' });
assert.deepEqual(stockDeltaFromQty(40, 40), { label: '0', variant: 'secondary' });

console.log('stock-delta checks passed');

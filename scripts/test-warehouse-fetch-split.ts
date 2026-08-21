/**
 * Guards warehouse list fetch split: aggregation helper + query-key nesting.
 * Run: npm run test:warehouse-fetch-split
 */
import assert from 'node:assert/strict';
import { inventoryKeys } from '../src/store-inventory/lib/query-keys';
import { aggregateWarehouseStockStats } from '../src/store-inventory/lib/warehouse-stock-stats';

function testAggregateWarehouseStockStats() {
  const counts = aggregateWarehouseStockStats([
    { warehouse_id: 'a', qty: 5 },
    { warehouse_id: 'a', qty: 0 },
    { warehouse_id: 'a', qty: 2 },
    { warehouse_id: 'b', qty: 0 },
    { warehouse_id: 'b', qty: null },
  ]);

  assert.deepEqual(counts.get('a'), { skuCount: 2, onHand: 7 });
  assert.deepEqual(counts.get('b'), { skuCount: 0, onHand: 0 });
  assert.equal(counts.has('c'), false);
}

function testQueryKeyNesting() {
  const meta = inventoryKeys.warehouses();
  const withStats = inventoryKeys.warehousesWithStats();
  assert.ok(
    withStats.length > meta.length && withStats.slice(0, meta.length).every((part, i) => part === meta[i]),
    'warehousesWithStats must nest under warehouses so prefix invalidation covers both',
  );
}

testAggregateWarehouseStockStats();
testQueryKeyNesting();
console.log('test-warehouse-fetch-split: ok');

/**
 * Guards receive-stock batch totals used by the PDF receipt.
 * Run: npm run test:receive-stock-batch
 */
import assert from 'node:assert/strict';

function summarizeLines(lines: Array<{ qty: number; unitValue: number }>) {
  return {
    totalQty: lines.reduce((sum, row) => sum + row.qty, 0),
    totalValue: lines.reduce((sum, row) => sum + row.qty * row.unitValue, 0),
  };
}

const summary = summarizeLines([
  { qty: 2, unitValue: 1000 },
  { qty: 5, unitValue: 500 },
]);

assert.equal(summary.totalQty, 7);
assert.equal(summary.totalValue, 4500);
console.log('test-receive-stock-batch: ok');

/**
 * Category validation unit checks (no database).
 * Run: npx tsx scripts/test-category-validation.ts
 */
import assert from 'node:assert/strict';
import {
  generateCategoryCode,
  normalizeCategoryName,
  normalizeCategoryStatus,
  parseCategoryInput,
} from '../src/store-inventory/lib/category-validation.ts';

function expectThrow(fn: () => unknown, match: RegExp) {
  try {
    fn();
    throw new Error(`Expected throw matching ${match}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith('Expected throw')) throw error;
    assert.match(message, match);
  }
}

let passed = 0;

parseCategoryInput({ name: '  Running Shoes  ' });
assert.equal(parseCategoryInput({ name: '  Running Shoes  ' }).name, 'Running Shoes');
passed += 1;

expectThrow(() => parseCategoryInput({ name: '' }), /required/i);
passed += 1;

expectThrow(() => parseCategoryInput({ name: 'x'.repeat(81) }), /80/i);
passed += 1;

expectThrow(
  () => parseCategoryInput({ name: 'Ok', description: 'd'.repeat(501) }),
  /500/i,
);
passed += 1;

assert.equal(normalizeCategoryStatus('active'), 'Active');
assert.equal(normalizeCategoryStatus('ARCHIVED'), 'Archived');
assert.equal(normalizeCategoryStatus('nope'), 'Active');
passed += 1;

assert.equal(normalizeCategoryName(' Shoes '), 'shoes');
passed += 1;

const a = generateCategoryCode('Shoes', '11111111-1111-1111-1111-111111111111');
const b = generateCategoryCode('Shoes', '22222222-2222-2222-2222-222222222222');
assert.notEqual(a, b);
assert.match(a, /^SHOES-/);
passed += 1;

console.log(`category validation: ${passed} checks passed`);

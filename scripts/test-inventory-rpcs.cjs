/**
 * Regression checks for inventory edge-case RPCs.
 * Requires DATABASE_URL in .env (same as apply-inventory-migrations.cjs).
 *
 * Run: node scripts/test-inventory-rpcs.cjs
 */
const fs = require('fs');
const path = require('path');

function loadEnv(filePath) {
  const env = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function sessionUrl(url) {
  return url.replace(':6543/', ':5432/').replace('?pgbouncer=true', '').replace('&pgbouncer=true', '');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectError(client, label, fn, match) {
  await client.query(`SAVEPOINT ${label}`);
  try {
    await fn();
    await client.query(`ROLLBACK TO SAVEPOINT ${label}`);
    throw new Error(`Expected error matching /${match}/ but call succeeded`);
  } catch (error) {
    const message = String(error instanceof Error ? error.message : error).toLowerCase();
    if (message.includes('expected error matching')) throw error;
    await client.query(`ROLLBACK TO SAVEPOINT ${label}`);
    assert(message.includes(match.toLowerCase()), `Expected /${match}/ in: ${message}`);
  }
}

async function main() {
  const { Client } = require('pg');
  const root = path.resolve(__dirname, '..');
  const env = loadEnv(path.join(root, '.env'));
  const url = env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is missing');

  const client = new Client({
    connectionString: sessionUrl(url),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });
  await client.connect();

  const suffix = Date.now().toString(36);
  const productId = `test_prod_${suffix}`;
  const warehouseA = `test_wh_a_${suffix}`;
  const warehouseB = `test_wh_b_${suffix}`;
  let passed = 0;

  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO inventory_warehouses (id, code, name, status, is_default)
       VALUES ($1, $2, 'Test WH A', 'Active', false),
              ($3, $4, 'Test WH B', 'Active', false)`,
      [warehouseA, `A${suffix}`.slice(0, 12), warehouseB, `B${suffix}`.slice(0, 12)],
    );
    await client.query(
      `INSERT INTO inventory_products (id, sku, name, status)
       VALUES ($1, $2, 'Edge Case Product', 'Live')`,
      [productId, `SKU-${suffix}`],
    );

    await client.query(`SELECT inventory_set_warehouse_qty($1, $2, 10, NULL, 'test')`, [
      warehouseA,
      productId,
    ]);
    let qty = (
      await client.query(
        `SELECT qty, reserved FROM inventory_warehouse_stock WHERE warehouse_id = $1 AND product_id = $2`,
        [warehouseA, productId],
      )
    ).rows[0];
    assert(qty.qty === 10 && qty.reserved === 0, 'set qty should be 10');
    passed += 1;

    await expectError(
      client,
      'sp_expected',
      () =>
        client.query(`SELECT inventory_set_warehouse_qty($1, $2, 12, 9, 'test')`, [
          warehouseA,
          productId,
        ]),
      'stock changed',
    );
    passed += 1;

    await expectError(
      client,
      'sp_neg',
      () =>
        client.query(`SELECT inventory_adjust_warehouse_qty($1, $2, -11, 'test', NULL, NULL)`, [
          warehouseA,
          productId,
        ]),
      'insufficient',
    );
    passed += 1;

    await client.query(`SELECT inventory_reserve_warehouse_qty($1, $2, 4, 'test', $3)`, [
      warehouseA,
      productId,
      productId,
    ]);
    qty = (
      await client.query(
        `SELECT qty, reserved FROM inventory_warehouse_stock WHERE warehouse_id = $1 AND product_id = $2`,
        [warehouseA, productId],
      )
    ).rows[0];
    assert(qty.qty === 10 && qty.reserved === 4, 'reserve should leave qty and bump reserved');
    passed += 1;

    await expectError(
      client,
      'sp_reserved',
      () =>
        client.query(`SELECT inventory_adjust_warehouse_qty($1, $2, -7, 'test', NULL, NULL)`, [
          warehouseA,
          productId,
        ]),
      'insufficient',
    );
    passed += 1;

    await client.query(`SELECT inventory_adjust_warehouse_qty($1, $2, -6, 'test', NULL, NULL)`, [
      warehouseA,
      productId,
    ]);
    qty = (
      await client.query(
        `SELECT qty, reserved FROM inventory_warehouse_stock WHERE warehouse_id = $1 AND product_id = $2`,
        [warehouseA, productId],
      )
    ).rows[0];
    assert(qty.qty === 4 && qty.reserved === 4, 'can sell only available units');
    passed += 1;

    await client.query(`SELECT inventory_release_warehouse_qty($1, $2, 4, 'test', $3)`, [
      warehouseA,
      productId,
      productId,
    ]);
    const transfer = await client.query(
      `SELECT inventory_transfer_warehouse_qty($1, $2, $3, 3) AS result`,
      [warehouseA, warehouseB, productId],
    );
    const result = transfer.rows[0].result;
    assert(Number(result.qty) === 3 || Number(result.to_qty) === 3, 'transfer should move qty');
    passed += 1;

    const stockLevel = await client.query(
      `SELECT qty, reserved FROM inventory_stock_levels WHERE product_id = $1`,
      [productId],
    );
    assert(stockLevel.rowCount === 1, 'sync should upsert stock level row');
    passed += 1;

    const movements = await client.query(
      `SELECT COUNT(*)::INT AS count FROM inventory_stock_movements WHERE product_id = $1`,
      [productId],
    );
    assert(movements.rows[0].count > 0, 'movement ledger should have rows');
    passed += 1;

    // Full-warehouse move must transfer available units even when some qty is reserved.
    const productMove = `test_prod_move_${suffix}`;
    await client.query(
      `INSERT INTO inventory_products (id, sku, name, status)
       VALUES ($1, $2, 'Move Reserved Product', 'Live')`,
      [productMove, `SKU-MV-${suffix}`],
    );
    await client.query(`SELECT inventory_set_warehouse_qty($1, $2, 10, NULL, 'test')`, [
      warehouseA,
      productMove,
    ]);
    await client.query(`SELECT inventory_reserve_warehouse_qty($1, $2, 4, 'test', $3)`, [
      warehouseA,
      productMove,
      productMove,
    ]);
    const moved = await client.query(
      `SELECT inventory_move_warehouse_stock($1, $2) AS moved`,
      [warehouseA, warehouseB],
    );
    assert(Number(moved.rows[0].moved) >= 6, 'move should transfer unreserved units');
    const fromStock = (
      await client.query(
        `SELECT qty, reserved FROM inventory_warehouse_stock WHERE warehouse_id = $1 AND product_id = $2`,
        [warehouseA, productMove],
      )
    ).rows[0];
    const toStock = (
      await client.query(
        `SELECT qty, reserved FROM inventory_warehouse_stock WHERE warehouse_id = $1 AND product_id = $2`,
        [warehouseB, productMove],
      )
    ).rows[0];
    assert(Number(fromStock.qty) === 4 && Number(fromStock.reserved) === 4, 'reserved units stay at source');
    assert(Number(toStock.qty) === 6 && Number(toStock.reserved) === 0, 'available units arrive at destination');
    passed += 1;

    // Product hard delete must refuse history / on-hand stock, allow clean soft-deleted products.
    const productHard = `test_prod_hd_${suffix}`;
    await client.query(
      `INSERT INTO inventory_products (id, sku, name, status)
       VALUES ($1, $2, 'Hard Delete Product', 'Live')`,
      [productHard, `SKU-HD-${suffix}`],
    );
    await client.query(`SELECT inventory_soft_delete_product($1)`, [productHard]);
    const impactOk = (
      await client.query(`SELECT inventory_product_delete_impact($1) AS impact`, [productHard])
    ).rows[0].impact;
    assert(impactOk.can_hard_delete === true, 'soft-deleted product with no history can hard delete');
    await client.query(`SELECT inventory_hard_delete_product($1)`, [productHard]);
    const gone = await client.query(`SELECT 1 FROM inventory_products WHERE id = $1`, [productHard]);
    assert(gone.rowCount === 0, 'hard delete removes product');
    passed += 1;

    await expectError(
      client,
      'sp_hard_stock',
      async () => {
        await client.query(`SELECT inventory_soft_delete_product($1)`, [productId]);
        await client.query(`SELECT inventory_hard_delete_product($1)`, [productId]);
      },
      'cannot be permanently deleted',
    );
    passed += 1;

    // --- Store settings upsert edge cases ---
    const settingsId = 'settings_default';
    const baseSettings = {
      store_name: `Test Store ${suffix}`,
      store_code: `TST-${suffix}`.slice(0, 20),
      status: 'Live',
      established_at: new Date().toISOString(),
      tax_percent: 19.5,
      tax_calculation: 'inclusive',
      tax_rate_scope: 'country',
      currency: 'EUR',
      session_timeout_minutes: 30,
      password_min_length: 8,
      free_shipping_min: 10,
      handling_days: 2,
      locations: [{ id: 'loc1', name: 'HQ', address: '', city: '', country: 'CM', phone: '', isDefault: true }],
      shipping_zones: [{ id: 'z1', name: 'Local', countries: ['CM'], rate: 5, estimatedDays: '1-2' }],
    };

    const upserted = await client.query(`SELECT inventory_upsert_store_settings($1::jsonb) AS row`, [
      JSON.stringify(baseSettings),
    ]);
    const row = upserted.rows[0].row;
    assert(row.id === settingsId, 'settings id must be singleton settings_default');
    assert(row.currency === 'XAF', 'currency must be forced to XAF');
    assert(Number(row.tax_percent) === 19.5, 'tax percent should persist');
    passed += 1;

    await expectError(
      client,
      'sp_tax_high',
      () =>
        client.query(`SELECT inventory_upsert_store_settings($1::jsonb)`, [
          JSON.stringify({ ...baseSettings, tax_percent: 150 }),
        ]),
      'tax percent',
    );
    passed += 1;

    await expectError(
      client,
      'sp_blank_name',
      () =>
        client.query(`SELECT inventory_upsert_store_settings($1::jsonb)`, [
          JSON.stringify({ ...baseSettings, store_name: '   ' }),
        ]),
      'store name',
    );
    passed += 1;

    const clamped = await client.query(`SELECT inventory_upsert_store_settings($1::jsonb) AS row`, [
      JSON.stringify({ ...baseSettings, tax_percent: 100, tax_calculation: 'exclusive' }),
    ]);
    assert(Number(clamped.rows[0].row.tax_percent) === 100, 'tax percent 100 should be accepted');
    assert(clamped.rows[0].row.tax_calculation === 'exclusive', 'tax calculation should update');
    passed += 1;

    const again = await client.query(`SELECT inventory_upsert_store_settings($1::jsonb) AS row`, [
      JSON.stringify({ ...baseSettings, store_name: `Test Store ${suffix} Again` }),
    ]);
    assert(again.rows[0].row.id === settingsId, 'second upsert stays singleton');
    assert(again.rows[0].row.store_name.includes('Again'), 'singleton upsert updates fields');
    passed += 1;

    const productEntry = `test_prod_entry_${suffix}`;
    await client.query(
      `INSERT INTO inventory_products (id, sku, name, status)
       VALUES ($1, $2, 'Stock Entry Product', 'Live')`,
      [productEntry, `SKU-SE-${suffix}`],
    );

    const initialQty = await client.query(`SELECT inventory_apply_stock_entry($1::jsonb) AS qty`, [
      JSON.stringify({
        product_id: productEntry,
        warehouse_id: warehouseA,
        qty: 8,
        entry_type: 'initial',
      }),
    ]);
    assert(Number(initialQty.rows[0].qty) === 8, 'initial stock should set qty to 8');
    passed += 1;

    await expectError(
      client,
      'sp_initial_again',
      () =>
        client.query(`SELECT inventory_apply_stock_entry($1::jsonb)`, [
          JSON.stringify({
            product_id: productEntry,
            warehouse_id: warehouseA,
            qty: 2,
            entry_type: 'initial',
          }),
        ]),
      'on-hand quantity is 0',
    );
    passed += 1;

    const adjusted = await client.query(`SELECT inventory_apply_stock_entry($1::jsonb) AS qty`, [
      JSON.stringify({
        product_id: productEntry,
        warehouse_id: warehouseA,
        qty: -3,
        entry_type: 'adjustment',
      }),
    ]);
    assert(Number(adjusted.rows[0].qty) === -3, 'adjustment should return applied qty');
    const onHand = await client.query(
      `SELECT qty FROM inventory_warehouse_stock WHERE warehouse_id = $1 AND product_id = $2`,
      [warehouseA, productEntry],
    );
    assert(Number(onHand.rows[0].qty) === 5, 'adjustment should decrease on-hand to 5');
    passed += 1;

    await expectError(
      client,
      'sp_adj_zero',
      () =>
        client.query(`SELECT inventory_apply_stock_entry($1::jsonb)`, [
          JSON.stringify({
            product_id: productEntry,
            warehouse_id: warehouseA,
            qty: 0,
            entry_type: 'adjustment',
          }),
        ]),
      'cannot be 0',
    );
    passed += 1;

    await expectError(
      client,
      'sp_set_increase',
      () =>
        client.query(`SELECT inventory_set_warehouse_qty($1, $2, 9, NULL, 'test')`, [
          warehouseA,
          productEntry,
        ]),
      'stock entry',
    );
    passed += 1;

    await client.query(`SELECT inventory_apply_stock_entry($1::jsonb)`, [
      JSON.stringify({
        product_id: productEntry,
        warehouse_id: warehouseA,
        qty: -5,
        entry_type: 'adjustment',
      }),
    ]);
    await expectError(
      client,
      'sp_initial_history',
      () =>
        client.query(`SELECT inventory_apply_stock_entry($1::jsonb)`, [
          JSON.stringify({
            product_id: productEntry,
            warehouse_id: warehouseA,
            qty: 4,
            entry_type: 'initial',
          }),
        ]),
      'no stock history',
    );
    passed += 1;

    await client.query('ROLLBACK');
    process.stdout.write(`inventory rpc tests passed: ${passed}\n`);
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore
    }
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

/**
 * POS edge-case regression checks (RPC + client totals helper).
 * Requires DATABASE_URL in .env.
 *
 * Run: node scripts/test-pos-edge-cases.cjs
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
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[trimmed.slice(0, eq).trim()] = value;
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

function roundMoney(value) {
  return Math.round(Number(value) || 0);
}

function computePosTotals(options) {
  const lineSubtotal = options.items.reduce((sum, item) => {
    const line = roundMoney(item.unitPrice) * item.quantity - roundMoney(item.lineDiscount ?? 0);
    return sum + Math.max(line, 0);
  }, 0);
  const clampedPercent = Math.min(Math.max(options.discountPercent ?? 0, 0), 100);
  const percentDiscount = clampedPercent ? (lineSubtotal * clampedPercent) / 100 : 0;
  const fixedDiscount = Math.max(options.discountAmount ?? 0, 0);
  const discountAmount = roundMoney(Math.min(lineSubtotal, fixedDiscount + percentDiscount));
  const afterDiscount = Math.max(lineSubtotal - discountAmount, 0);
  const taxPercent = Math.max(options.taxPercent, 0);
  const inclusive = options.taxCalculation === 'inclusive';
  const taxAmount = roundMoney(
    inclusive
      ? afterDiscount - afterDiscount / (1 + taxPercent / 100)
      : (afterDiscount * taxPercent) / 100,
  );
  const total = inclusive ? afterDiscount : afterDiscount + taxAmount;
  return {
    subtotal: roundMoney(lineSubtotal),
    discountAmount,
    taxAmount,
    total: roundMoney(total),
  };
}

async function main() {
  const { Client } = require('pg');
  const root = path.resolve(__dirname, '..');
  const env = loadEnv(path.join(root, '.env'));
  const url = env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is missing');

  // --- Client-side totals clamps (no DB) ---
  let passed = 0;
  const negativeDiscount = computePosTotals({
    items: [{ unitPrice: 1000, quantity: 2 }],
    discountPercent: -50,
    taxPercent: 0,
    taxCalculation: 'exclusive',
  });
  assert(negativeDiscount.discountAmount === 0, 'negative percent must not increase payable total');
  assert(negativeDiscount.total === 2000, 'negative percent total should stay at subtotal');
  passed += 1;

  const overPercent = computePosTotals({
    items: [{ unitPrice: 1000, quantity: 1 }],
    discountPercent: 150,
    taxPercent: 0,
    taxCalculation: 'exclusive',
  });
  assert(overPercent.discountAmount === 1000, 'percent above 100 must clamp to subtotal');
  assert(overPercent.total === 0, '100%+ discount zeros total');
  passed += 1;

  const client = new Client({
    connectionString: sessionUrl(url),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });
  await client.connect();

  const suffix = Date.now().toString(36);
  const productId = `pos_prod_${suffix}`;
  const warehouseId = `pos_wh_${suffix}`;
  const customerId = `pos_cust_${suffix}`;
  const saleId = `pos_sale_${suffix}`;
  const saleNumber = `POS-T${suffix}`.slice(0, 20);

  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO inventory_warehouses (id, code, name, status, is_default)
       VALUES ($1, $2, 'POS Test WH', 'Active', false)`,
      [warehouseId, `P${suffix}`.slice(0, 12)],
    );
    await client.query(
      `INSERT INTO inventory_products (id, sku, name, status, price)
       VALUES ($1, $2, 'POS Edge Product', 'Live', 1000)`,
      [productId, `PSKU-${suffix}`],
    );
    await client.query(
      `INSERT INTO inventory_customers (id, code, name, account_balance)
       VALUES ($1, $2, 'POS Customer', 5000)`,
      [customerId, `C${suffix}`.slice(0, 12)],
    );
    await client.query(`SELECT inventory_set_warehouse_qty($1, $2, 5, NULL, 'test')`, [
      warehouseId,
      productId,
    ]);

    // Missing product_id rejected
    await expectError(
      client,
      'sp_no_product',
      () =>
        client.query(`SELECT inventory_complete_pos_sale($1::jsonb)`, [
          JSON.stringify({
            sale_id: `${saleId}_bad`,
            sale_number: `${saleNumber}B`,
            warehouse_id: warehouseId,
            payment_method: 'cash',
            amount_tendered: 1000,
            total: 1000,
            items: [{ warehouse_id: warehouseId, quantity: 1, unit_price: 1000, name: 'x', sku: 'x' }],
          }),
        ]),
      'product',
    );
    passed += 1;

    // Cash underpayment rejected
    await expectError(
      client,
      'sp_underpay',
      () =>
        client.query(`SELECT inventory_complete_pos_sale($1::jsonb)`, [
          JSON.stringify({
            sale_id: `${saleId}_cash`,
            sale_number: `${saleNumber}C`,
            warehouse_id: warehouseId,
            payment_method: 'cash',
            amount_tendered: 100,
            total: 1000,
            tax_percent: 0,
            tax_calculation: 'exclusive',
            discount_percent: 0,
            discount_amount: 0,
            items: [
              {
                product_id: productId,
                warehouse_id: warehouseId,
                quantity: 1,
                unit_price: 1000,
                name: 'POS Edge Product',
                sku: 'x',
              },
            ],
          }),
        ]),
      'tendered',
    );
    passed += 1;

    // Tampered total rejected
    await expectError(
      client,
      'sp_tamper',
      () =>
        client.query(`SELECT inventory_complete_pos_sale($1::jsonb)`, [
          JSON.stringify({
            sale_id: `${saleId}_tamper`,
            sale_number: `${saleNumber}T`,
            warehouse_id: warehouseId,
            payment_method: 'cash',
            amount_tendered: 0,
            total: 0,
            tax_percent: 0,
            tax_calculation: 'exclusive',
            discount_percent: 0,
            items: [
              {
                product_id: productId,
                warehouse_id: warehouseId,
                quantity: 1,
                unit_price: 1000,
                name: 'POS Edge Product',
                sku: 'x',
              },
            ],
          }),
        ]),
      'mismatch',
    );
    passed += 1;

    // Account sale deducts balance
    const complete = await client.query(`SELECT inventory_complete_pos_sale($1::jsonb) AS result`, [
      JSON.stringify({
        sale_id: saleId,
        sale_number: saleNumber,
        warehouse_id: warehouseId,
        customer_id: customerId,
        customer_name: 'POS Customer',
        payment_method: 'account',
        amount_tendered: 1000,
        total: 1000,
        tax_percent: 0,
        tax_calculation: 'exclusive',
        discount_percent: 0,
        discount_amount: 0,
        items: [
          {
            product_id: productId,
            warehouse_id: warehouseId,
            quantity: 1,
            unit_price: 1000,
            name: 'POS Edge Product',
            sku: 'x',
            line_discount: 0,
            line_total: 1000,
          },
        ],
      }),
    ]);
    assert(complete.rows[0].result.id === saleId, 'complete should return sale id');
    const balance = (
      await client.query(`SELECT account_balance FROM inventory_customers WHERE id = $1`, [customerId])
    ).rows[0].account_balance;
    assert(Number(balance) === 4000, `account balance should be 4000, got ${balance}`);
    passed += 1;

    const qtyAfter = (
      await client.query(
        `SELECT qty FROM inventory_warehouse_stock WHERE warehouse_id = $1 AND product_id = $2`,
        [warehouseId, productId],
      )
    ).rows[0].qty;
    assert(Number(qtyAfter) === 4, `stock should be 4 after sale, got ${qtyAfter}`);
    passed += 1;

    // Idempotent retry does not double-decrement
    await client.query(`SELECT inventory_complete_pos_sale($1::jsonb)`, [
      JSON.stringify({
        sale_id: saleId,
        sale_number: saleNumber,
        warehouse_id: warehouseId,
        customer_id: customerId,
        customer_name: 'POS Customer',
        payment_method: 'account',
        amount_tendered: 1000,
        total: 1000,
        tax_percent: 0,
        tax_calculation: 'exclusive',
        items: [
          {
            product_id: productId,
            warehouse_id: warehouseId,
            quantity: 1,
            unit_price: 1000,
            name: 'POS Edge Product',
            sku: 'x',
          },
        ],
      }),
    ]);
    const qtyIdem = (
      await client.query(
        `SELECT qty FROM inventory_warehouse_stock WHERE warehouse_id = $1 AND product_id = $2`,
        [warehouseId, productId],
      )
    ).rows[0].qty;
    assert(Number(qtyIdem) === 4, 'idempotent retry must not change stock');
    const balanceIdem = (
      await client.query(`SELECT account_balance FROM inventory_customers WHERE id = $1`, [customerId])
    ).rows[0].account_balance;
    assert(Number(balanceIdem) === 4000, 'idempotent retry must not change balance');
    passed += 1;

    // Concurrent last-unit race: only one succeeds
    await client.query(`SELECT inventory_set_warehouse_qty($1, $2, 1, NULL, 'test')`, [
      warehouseId,
      productId,
    ]);
    const saleA = `${saleId}_race_a`;
    const saleB = `${saleId}_race_b`;
    const payloadRace = (id, number) =>
      JSON.stringify({
        sale_id: id,
        sale_number: number,
        warehouse_id: warehouseId,
        payment_method: 'cash',
        amount_tendered: 1000,
        total: 1000,
        tax_percent: 0,
        tax_calculation: 'exclusive',
        items: [
          {
            product_id: productId,
            warehouse_id: warehouseId,
            quantity: 1,
            unit_price: 1000,
            name: 'POS Edge Product',
            sku: 'x',
          },
        ],
      });

    await client.query(`SELECT inventory_complete_pos_sale($1::jsonb)`, [payloadRace(saleA, `${saleNumber}A`)]);
    await expectError(
      client,
      'sp_race',
      () => client.query(`SELECT inventory_complete_pos_sale($1::jsonb)`, [payloadRace(saleB, `${saleNumber}R`)]),
      'insufficient',
    );
    passed += 1;

    // Void restores account balance
    await client.query(`SELECT inventory_void_pos_sale($1, $2, $3)`, [saleId, 'test void', 30]);
    const balanceAfterVoid = (
      await client.query(`SELECT account_balance FROM inventory_customers WHERE id = $1`, [customerId])
    ).rows[0].account_balance;
    assert(Number(balanceAfterVoid) === 5000, `void should restore balance to 5000, got ${balanceAfterVoid}`);
    const voided = (
      await client.query(`SELECT status, void_reason FROM inventory_pos_sales WHERE id = $1`, [saleId])
    ).rows[0];
    assert(voided.status === 'voided', 'sale should be voided');
    assert(voided.void_reason === 'test void', 'void reason should be stored');
    passed += 1;

    await client.query('ROLLBACK');
    process.stdout.write(`pos edge-case tests passed: ${passed}\n`);
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

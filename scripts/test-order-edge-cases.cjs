/**
 * Orders edge-case regression checks (RPC + client pricing helper).
 * Requires DATABASE_URL in .env.
 *
 * Run: node scripts/test-order-edge-cases.cjs
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

function computeOrderPricing(items, options = {}) {
  if (!items.length) return { subtotal: 0, shippingCost: 0, tax: 0, total: 0 };
  const subtotal = roundMoney(
    items.reduce((sum, item) => sum + roundMoney(item.price) * Math.max(Math.trunc(item.quantity ?? 1), 0), 0),
  );
  const shippingFlat = roundMoney(options.shippingFlat ?? 10);
  const freeShippingEnabled = options.freeShippingEnabled ?? true;
  const freeShippingMin = roundMoney(options.freeShippingMin ?? 0);
  const shippingCost = freeShippingEnabled && subtotal >= freeShippingMin ? 0 : shippingFlat;
  const taxPercent = Math.min(Math.max(Number(options.taxPercent ?? 0), 0), 100);
  const inclusive = (options.taxCalculation ?? 'exclusive') === 'inclusive';
  const tax = roundMoney(
    taxPercent <= 0
      ? 0
      : inclusive
        ? subtotal - subtotal / (1 + taxPercent / 100)
        : (subtotal * taxPercent) / 100,
  );
  const total = inclusive ? roundMoney(subtotal + shippingCost) : roundMoney(subtotal + shippingCost + tax);
  return { subtotal, shippingCost, tax, total };
}

async function main() {
  const { Client } = require('pg');
  const root = path.resolve(__dirname, '..');
  const env = loadEnv(path.join(root, '.env'));
  const url = env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is missing');

  let passed = 0;

  const pricing = computeOrderPricing([{ price: 1000, quantity: 2 }], {
    taxPercent: 10,
    taxCalculation: 'exclusive',
    freeShippingEnabled: true,
    freeShippingMin: 5000,
  });
  assert(pricing.subtotal === 2000, 'subtotal');
  assert(pricing.shippingCost === 10, 'shipping below free threshold');
  assert(pricing.tax === 200, 'exclusive tax');
  assert(pricing.total === 2210, 'total');
  passed += 1;

  const freeShip = computeOrderPricing([{ price: 3000, quantity: 2 }], {
    taxPercent: 0,
    freeShippingEnabled: true,
    freeShippingMin: 5000,
  });
  assert(freeShip.shippingCost === 0, 'free shipping applies');
  passed += 1;

  const client = new Client({
    connectionString: sessionUrl(url),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });
  await client.connect();

  const suffix = Date.now().toString(36);
  const productId = `ord_prod_${suffix}`;
  const warehouseId = `ord_wh_${suffix}`;
  const customerId = `ord_cust_${suffix}`;
  const orderId = `ord_${suffix}`;
  const orderNumber = `SO-T${suffix}`.slice(0, 20);

  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO inventory_warehouses (id, code, name, status, is_default)
       VALUES ($1, $2, $3, 'Active', false)`,
      [warehouseId, `W${suffix}`.slice(0, 8), `Order WH ${suffix}`],
    );

    await client.query(
      `INSERT INTO inventory_products (id, sku, name, price, status)
       VALUES ($1, $2, $3, 1000, 'Live')`,
      [productId, `SKU-${suffix}`, `Order Product ${suffix}`],
    );

    await client.query(`SELECT inventory_set_warehouse_qty($1, $2, 50, NULL, 'test')`, [
      warehouseId,
      productId,
    ]);

    await client.query(
      `INSERT INTO inventory_customers (id, code, name, email, status)
       VALUES ($1, $2, $3, $4, 'Active')`,
      [customerId, `C${suffix}`.slice(0, 10), `Order Cust ${suffix}`, `ord_${suffix}@example.com`],
    );

    // Empty items rejected
    await expectError(
      client,
      'sp_empty',
      async () => {
        await client.query(`SELECT inventory_create_order($1::jsonb)`, [
          JSON.stringify({
            id: `${orderId}_empty`,
            order_number: `${orderNumber}-E`,
            date: '20 Aug, 2026',
            customer_id: customerId,
            customer_name: 'Cust',
            items: [],
          }),
        ]);
      },
      'at least one line item',
    );
    passed += 1;

    // Create + reserve
    const created = await client.query(`SELECT inventory_create_order($1::jsonb) AS result`, [
      JSON.stringify({
        id: orderId,
        order_number: orderNumber,
        date: '20 Aug, 2026',
        customer_id: customerId,
        customer_name: 'Cust',
        warehouse_id: warehouseId,
        delivery_status: 'Pending',
        payment_status: 'Unpaid',
        items: [{ product_id: productId, price: 1000, quantity: 2 }],
      }),
    ]);
    assert(created.rows[0].result.id === orderId, 'create returns id');
    const reserved = await client.query(`SELECT inventory_state, reserved FROM inventory_orders o
      JOIN inventory_order_items i ON i.order_id = o.id WHERE o.id = $1`, [orderId]);
    assert(reserved.rows[0].inventory_state === 'reserved', 'reserved after create');
    assert(Number(reserved.rows[0].reserved) === 2, 'line reserved qty');
    passed += 1;

    // Idempotent create
    const again = await client.query(`SELECT inventory_create_order($1::jsonb) AS result`, [
      JSON.stringify({
        id: `${orderId}_2`,
        idempotency_key: `idem_${suffix}`,
        order_number: `${orderNumber}-2`,
        date: '20 Aug, 2026',
        customer_name: 'Cust',
        warehouse_id: warehouseId,
        items: [{ product_id: productId, price: 1000, quantity: 1 }],
      }),
    ]);
    const again2 = await client.query(`SELECT inventory_create_order($1::jsonb) AS result`, [
      JSON.stringify({
        id: `${orderId}_3`,
        idempotency_key: `idem_${suffix}`,
        order_number: `${orderNumber}-3`,
        date: '20 Aug, 2026',
        customer_name: 'Cust',
        warehouse_id: warehouseId,
        items: [{ product_id: productId, price: 1000, quantity: 1 }],
      }),
    ]);
    assert(again.rows[0].result.id === again2.rows[0].result.id, 'idempotency returns same order');
    passed += 1;

    // Invalid transition Delivered -> Pending
    await client.query(`SELECT inventory_update_order($1, $2::jsonb)`, [
      orderId,
      JSON.stringify({ delivery_status: 'Shipped' }),
    ]);
    let state = await client.query(`SELECT inventory_state FROM inventory_orders WHERE id = $1`, [orderId]);
    assert(state.rows[0].inventory_state === 'fulfilled', 'shipped fulfills stock');
    passed += 1;

    await expectError(
      client,
      'sp_bad_transition',
      async () => {
        await client.query(`SELECT inventory_update_order($1, $2::jsonb)`, [
          orderId,
          JSON.stringify({ delivery_status: 'Pending' }),
        ]);
      },
      'invalid delivery status transition',
    );
    passed += 1;

    // Hard delete fulfilled blocked; cancel restocks
    await expectError(
      client,
      'sp_hard_delete',
      async () => {
        await client.query(`SELECT inventory_delete_order($1)`, [orderId]);
      },
      'hard-delete',
    );
    passed += 1;

    await client.query(`SELECT inventory_cancel_order($1, $2)`, [orderId, 'test cancel']);
    state = await client.query(
      `SELECT delivery_status, inventory_state FROM inventory_orders WHERE id = $1`,
      [orderId],
    );
    assert(state.rows[0].delivery_status === 'Canceled', 'canceled status');
    assert(state.rows[0].inventory_state === 'released', 'restocked after cancel');
    const stock = await client.query(
      `SELECT qty, reserved FROM inventory_warehouse_stock WHERE warehouse_id = $1 AND product_id = $2`,
      [warehouseId, productId],
    );
    // Idempotent sibling order still holds 1 reserved unit.
    assert(Number(stock.rows[0].qty) === 50, 'qty restored');
    assert(Number(stock.rows[0].reserved) === 1, 'only sibling reservation remains');
    passed += 1;

    // Double reserve is idempotent on already-reserved order — create fresh
    const orderB = `${orderId}_b`;
    await client.query(`SELECT inventory_create_order($1::jsonb)`, [
      JSON.stringify({
        id: orderB,
        order_number: `${orderNumber}-B`,
        date: '20 Aug, 2026',
        customer_name: 'Cust',
        warehouse_id: warehouseId,
        items: [{ product_id: productId, price: 500, quantity: 1 }],
      }),
    ]);
    const r1 = await client.query(`SELECT inventory_reserve_order($1, $2) AS result`, [orderB, warehouseId]);
    const r2 = await client.query(`SELECT inventory_reserve_order($1, $2) AS result`, [orderB, warehouseId]);
    assert(r1.rows[0].result.state === 'reserved', 'first reserve');
    assert(r2.rows[0].result.state === 'reserved', 'second reserve idempotent');
    passed += 1;

    await expectError(
      client,
      'sp_fulfill_none',
      async () => {
        const orphan = `${orderId}_orphan`;
        await client.query(
          `INSERT INTO inventory_orders (
             id, order_number, date, customer_name, total, item_count,
             delivery_status, payment_status, inventory_state
           ) VALUES ($1, $2, '20 Aug, 2026', 'X', 0, 0, 'Pending', 'Unpaid', 'none')`,
          [orphan, `${orderNumber}-O`],
        );
        await client.query(`SELECT inventory_fulfill_order($1)`, [orphan]);
      },
      'must be reserved',
    );
    passed += 1;

    await client.query('ROLLBACK');
    console.log(`order edge cases passed: ${passed}`);
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

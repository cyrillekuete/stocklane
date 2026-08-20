/**
 * Regression checks for customer edge-case RPCs.
 * Requires DATABASE_URL in .env (same as apply-inventory-migrations.cjs).
 *
 * Run: node scripts/test-customer-rpcs.cjs
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
  const customerA = `test_cust_a_${suffix}`;
  const customerB = `test_cust_b_${suffix}`;
  const customerC = `test_cust_c_${suffix}`;
  let passed = 0;

  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO inventory_customers (id, code, name, email, status, account_balance, order_count, total_spent)
       VALUES
         ($1, $2, 'Edge Customer A', $3, 'Active', 0, '0', 0),
         ($4, $5, 'Edge Customer B', $6, 'Active', 25, '0', 0),
         ($7, $8, 'Edge Customer C', NULL, 'Inactive', 0, '0', 0)`,
      [
        customerA,
        `CA-${suffix}`.slice(0, 20),
        `a-${suffix}@example.com`,
        customerB,
        `CB-${suffix}`.slice(0, 20),
        `b-${suffix}@example.com`,
        customerC,
        `CC-${suffix}`.slice(0, 20),
      ],
    );

    await expectError(
      client,
      'sp_soft_balance',
      () => client.query(`SELECT inventory_soft_delete_customer($1)`, [customerB]),
      'settle',
    );
    passed += 1;

    await client.query(`SELECT inventory_soft_delete_customer($1)`, [customerA]);
    const soft = await client.query(
      `SELECT deleted_at, status FROM inventory_customers WHERE id = $1`,
      [customerA],
    );
    assert(soft.rows[0].deleted_at != null, 'soft delete should set deleted_at');
    assert(soft.rows[0].status === 'Archived', 'soft delete should set Archived');
    passed += 1;

    await expectError(
      client,
      'sp_deposit_archived',
      () =>
        client.query(`SELECT inventory_deposit_customer_account($1::jsonb)`, [
          JSON.stringify({
            customer_id: customerA,
            amount: 10,
            payment_method: 'cash',
          }),
        ]),
      'archived',
    );
    passed += 1;

    await expectError(
      client,
      'sp_deposit_inactive',
      () =>
        client.query(`SELECT inventory_deposit_customer_account($1::jsonb)`, [
          JSON.stringify({
            customer_id: customerC,
            amount: 10,
            payment_method: 'cash',
          }),
        ]),
      'active',
    );
    passed += 1;

    await client.query(`SELECT inventory_restore_customer($1)`, [customerA]);
    const restored = await client.query(
      `SELECT deleted_at, status FROM inventory_customers WHERE id = $1`,
      [customerA],
    );
    assert(restored.rows[0].deleted_at == null, 'restore clears deleted_at');
    assert(restored.rows[0].status === 'Active', 'restore sets Active');
    passed += 1;

    await expectError(
      client,
      'sp_dup_email',
      () =>
        client.query(
          `INSERT INTO inventory_customers (id, code, name, email, status)
           VALUES ($1, $2, 'Dup Email', $3, 'Active')`,
          [`test_cust_dup_${suffix}`, `CD-${suffix}`.slice(0, 20), `a-${suffix}@example.com`],
        ),
      'unique',
    );
    passed += 1;

    await client.query(`SELECT inventory_apply_customer_spend($1, 100, 1)`, [customerA]);
    const spent = await client.query(
      `SELECT order_count, total_spent, avg_price FROM inventory_customers WHERE id = $1`,
      [customerA],
    );
    assert(spent.rows[0].order_count === '1', 'spend bump increments order_count');
    assert(Number(spent.rows[0].total_spent) === 100, 'spend bump adds total');
    assert(Number(spent.rows[0].avg_price) === 100, 'avg_price recomputed');
    passed += 1;

    await client.query(
      `INSERT INTO inventory_orders (
         id, order_number, date, customer_id, customer_name, total, item_count,
         delivery_status, payment_status
       ) VALUES (
         $1, $2, '20 Aug, 2026', $3, 'Edge Customer A', 100, 1, 'Pending', 'Unpaid'
       )`,
      [`test_ord_${suffix}`, `SO-T-${suffix}`.slice(0, 20), customerA],
    );

    await client.query(`SELECT inventory_soft_delete_customer($1)`, [customerC]);
    const impact = await client.query(`SELECT inventory_customer_delete_impact($1) AS impact`, [
      customerC,
    ]);
    assert(impact.rows[0].impact.can_hard_delete === true, 'unused archived customer can hard delete');
    passed += 1;

    await client.query(`SELECT inventory_hard_delete_customer($1)`, [customerC]);
    const gone = await client.query(`SELECT 1 FROM inventory_customers WHERE id = $1`, [customerC]);
    assert(gone.rowCount === 0, 'hard delete removes row');
    passed += 1;

    await client.query(`SELECT inventory_soft_delete_customer($1)`, [customerA]);
    await expectError(
      client,
      'sp_hard_history',
      () => client.query(`SELECT inventory_hard_delete_customer($1)`, [customerA]),
      'history',
    );
    passed += 1;

    // Customer with ledger cannot hard-delete even at zero balance after soft delete.
    await client.query(`UPDATE inventory_customers SET account_balance = 0 WHERE id = $1`, [customerB]);
    await client.query(
      `INSERT INTO inventory_customer_account_transactions
         (id, customer_id, type, amount, balance_after, payment_method)
       VALUES ($1, $2, 'deposit', 25, 25, 'cash')`,
      [`test_tx_${suffix}`, customerB],
    );
    await client.query(`SELECT inventory_soft_delete_customer($1)`, [customerB]);
    await expectError(
      client,
      'sp_hard_ledger',
      () => client.query(`SELECT inventory_hard_delete_customer($1)`, [customerB]),
      'history',
    );
    passed += 1;

    await client.query('ROLLBACK');
    process.stdout.write(`customer rpc tests passed: ${passed}\n`);
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

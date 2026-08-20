/**
 * Category edge-case DB checks (unique name/code, status check, delete SET NULL).
 * Requires DATABASE_URL in .env.
 *
 * Run: node scripts/test-category-edge-cases.cjs
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
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
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
  const catA = `test_cat_a_${suffix}`;
  const catB = `test_cat_b_${suffix}`;
  const productId = `test_prod_cat_${suffix}`;
  let passed = 0;

  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO inventory_categories (id, name, code, status, featured, total_earnings)
       VALUES ($1, $2, $3, 'Active', false, 0)`,
      [catA, `Edge Cat ${suffix}`, `EC-${suffix}`.slice(0, 16)],
    );
    passed += 1;

    await expectError(
      client,
      'dup_name',
      () =>
        client.query(
          `INSERT INTO inventory_categories (id, name, code, status)
           VALUES ($1, $2, $3, 'Active')`,
          [catB, `edge cat ${suffix}`, `EC2-${suffix}`.slice(0, 16)],
        ),
      'unique',
    );
    passed += 1;

    await expectError(
      client,
      'bad_status',
      () =>
        client.query(`UPDATE inventory_categories SET status = 'Nope' WHERE id = $1`, [catA]),
      'check',
    );
    passed += 1;

    await client.query(
      `INSERT INTO inventory_products (id, sku, name, status, category_id, price)
       VALUES ($1, $2, 'Edge Product', 'Published', $3, 10)`,
      [productId, `SKU-${suffix}`, catA],
    );

    await client.query(`DELETE FROM inventory_categories WHERE id = $1`, [catA]);
    const { rows } = await client.query(
      `SELECT category_id FROM inventory_products WHERE id = $1`,
      [productId],
    );
    assert(rows[0].category_id === null, 'Expected category_id SET NULL after category delete');
    passed += 1;

    await client.query('ROLLBACK');
    console.log(`category edge cases: ${passed} checks passed`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

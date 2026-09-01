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

async function main() {
  const { Client } = require('pg');
  const root = path.resolve(__dirname, '..');
  const env = loadEnv(path.join(root, '.env'));
  const url = env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is missing');

  const files = [
    'prisma/migrations/inventory_init.sql',
    'prisma/migrations/store_settings.sql',
    'prisma/migrations/customer_profile_fields.sql',
    'prisma/migrations/warehouse_stock_and_pos.sql',
    'prisma/migrations/customer_account_balance.sql',
    'prisma/migrations/pos_sale_item_warehouse.sql',
    'prisma/migrations/stock_level_flow_rate_decimal.sql',
    'prisma/migrations/inventory_rls_anon.sql',
    'prisma/migrations/store_currency_xaf.sql',
    'prisma/migrations/pos_account_credit_payments.sql',
    'prisma/migrations/warehouse_edge_cases.sql',
    'prisma/migrations/inventory_edge_case_hardening.sql',
    'prisma/migrations/products_edge_cases.sql',
    'prisma/migrations/pos_edge_case_hardening.sql',
    'prisma/migrations/pos_rpc_security_notes.sql',
    'prisma/migrations/category_edge_cases.sql',
    'prisma/migrations/category_p1_hardening.sql',
    'prisma/migrations/settings_edge_cases.sql',
    'prisma/migrations/customer_edge_cases.sql',
    'prisma/migrations/order_edge_case_hardening.sql',
    'prisma/migrations/order_rpc_security_notes.sql',
    'prisma/migrations/auth_profiles_and_roles.sql',
    'prisma/migrations/user_permissions.sql',
    'prisma/migrations/stock_entry_history.sql',
  ];

  const client = new Client({
    connectionString: sessionUrl(url),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });
  await client.connect();
  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(root, file), 'utf8');
      process.stdout.write(`Applying ${file}... `);
      await client.query(sql);
      process.stdout.write('ok\n');
    }
    const tables = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'inventory_%' ORDER BY table_name",
    );
    const columns = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'inventory_pos_sale_items' AND column_name = 'warehouse_id'",
    );
    process.stdout.write(`inventory tables: ${tables.rowCount}\n`);
    process.stdout.write(`sale-item warehouse_id: ${columns.rowCount ? 'present' : 'missing'}\n`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

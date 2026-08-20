/**
 * Seed three demo auth users (Admin, Cashier, Store Keeper).
 * Uses SUPABASE_SERVICE_ROLE_KEY — never expose this in the browser.
 *
 * Usage: node scripts/seed-auth-users.cjs
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

const DEMO_USERS = [
  {
    email: 'admin@stocklane.local',
    password: 'Admin123',
    role: 'admin',
    first_name: 'Ada',
    last_name: 'Admin',
  },
  {
    email: 'cashier@stocklane.local',
    password: 'Cashier123',
    role: 'cashier',
    first_name: 'Casey',
    last_name: 'Cashier',
  },
  {
    email: 'keeper@stocklane.local',
    password: 'Keeper123',
    role: 'store_keeper',
    first_name: 'Sam',
    last_name: 'Keeper',
  },
];

async function upsertUser(admin, user) {
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (list.error) throw list.error;
  const existing = list.data.users.find(
    (u) => u.email?.toLowerCase() === user.email.toLowerCase(),
  );

  const fullname = `${user.first_name} ${user.last_name}`.trim();

  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password: user.password,
      email_confirm: true,
      app_metadata: { role: user.role },
      user_metadata: {
        first_name: user.first_name,
        last_name: user.last_name,
        fullname,
      },
    });
    if (error) throw error;

    const { error: profileError } = await admin.from('inventory_profiles').upsert({
      id: data.user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      full_name: fullname,
      role: user.role,
      status: 'active',
      updated_at: new Date().toISOString(),
    });
    if (profileError) throw profileError;
    console.log(`Updated ${user.role}: ${user.email}`);
    return;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    app_metadata: { role: user.role },
    user_metadata: {
      first_name: user.first_name,
      last_name: user.last_name,
      fullname,
    },
  });
  if (error) throw error;

  // Trigger should create the profile; upsert to be safe.
  const { error: profileError } = await admin.from('inventory_profiles').upsert({
    id: data.user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    full_name: fullname,
    role: user.role,
    status: 'active',
    updated_at: new Date().toISOString(),
  });
  if (profileError) throw profileError;
  console.log(`Created ${user.role}: ${user.email}`);
}

async function main() {
  const root = path.resolve(__dirname, '..');
  const env = loadEnv(path.join(root, '.env'));
  const url = env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const user of DEMO_USERS) {
    await upsertUser(admin, user);
  }

  console.log('\nDemo accounts ready:');
  for (const user of DEMO_USERS) {
    console.log(`  ${user.role.padEnd(14)} ${user.email} / ${user.password}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

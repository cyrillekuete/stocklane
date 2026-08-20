/**
 * Create or update a single staff user (service role).
 *
 * Usage:
 *   node scripts/create-auth-user.cjs --email user@example.com --password 'Secret1' --role cashier --first Casey --last Cash
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

function arg(name, fallback = undefined) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

async function main() {
  const email = arg('email');
  const password = arg('password');
  const role = arg('role', 'cashier');
  const first_name = arg('first', '');
  const last_name = arg('last', '');

  if (!email || !password) {
    console.error(
      "Usage: node scripts/create-auth-user.cjs --email a@b.com --password 'Secret1' --role cashier --first Name --last Last",
    );
    process.exit(1);
  }
  if (!['admin', 'cashier', 'store_keeper'].includes(role)) {
    throw new Error('role must be admin | cashier | store_keeper');
  }

  const env = loadEnv(path.join(__dirname, '..', '.env'));
  const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const fullname = `${first_name} ${last_name}`.trim();
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (list.error) throw list.error;
  const existing = list.data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  let userId;
  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      app_metadata: { role },
      user_metadata: { first_name, last_name, fullname },
    });
    if (error) throw error;
    userId = data.user.id;
    console.log('Updated', email);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role },
      user_metadata: { first_name, last_name, fullname },
    });
    if (error) throw error;
    userId = data.user.id;
    console.log('Created', email);
  }

  const { error: profileError } = await admin.from('inventory_profiles').upsert({
    id: userId,
    email,
    first_name: first_name || null,
    last_name: last_name || null,
    full_name: fullname || email.split('@')[0],
    role,
    status: 'active',
    updated_at: new Date().toISOString(),
  });
  if (profileError) throw profileError;
  console.log({ id: userId, email, role });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Regression checks for per-user permissions RPC.
 * Run: node scripts/test-user-permissions.cjs
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const env = loadEnv(path.join(__dirname, '..', '.env'));
  const url = env.VITE_SUPABASE_URL;
  const anon = env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required');

  const adminClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const cashierClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });

  const adminAuth = await adminClient.auth.signInWithPassword({
    email: 'admin@stocklane.local',
    password: 'Admin123',
  });
  if (adminAuth.error) throw adminAuth.error;

  const cashierAuth = await cashierClient.auth.signInWithPassword({
    email: 'cashier@stocklane.local',
    password: 'Cashier123',
  });
  if (cashierAuth.error) throw cashierAuth.error;

  const { data: cashierProfile, error: fetchError } = await adminClient
    .from('inventory_profiles')
    .select('*')
    .eq('email', 'cashier@stocklane.local')
    .single();
  if (fetchError) throw fetchError;

  const original = cashierProfile.permissions;
  const custom = ['dashboard', 'pos', 'orders', 'customers', 'inventory'];

  try {
    const denied = await cashierClient.rpc('inventory_admin_update_user', {
      p_user_id: cashierProfile.id,
      p_permissions: custom,
    });
    assert(denied.error, 'Cashier should not be able to update permissions');
    assert(
      String(denied.error.message).toLowerCase().includes('admin'),
      `Unexpected cashier error: ${denied.error.message}`,
    );

    const { data: updated, error: updateError } = await adminClient.rpc('inventory_admin_update_user', {
      p_user_id: cashierProfile.id,
      p_permissions: custom,
    });
    if (updateError) throw updateError;
    assert(
      Array.isArray(updated.permissions) && updated.permissions.includes('inventory'),
      `Expected inventory grant, got ${JSON.stringify(updated.permissions)}`,
    );
    assert(
      !updated.permissions.includes('users'),
      'Non-admin must not receive users permission',
    );

    const restored = await adminClient.rpc('inventory_admin_update_user', {
      p_user_id: cashierProfile.id,
      p_permissions: original,
    });
    if (restored.error) throw restored.error;
    assert(
      JSON.stringify([...(restored.data.permissions || [])].sort()) ===
        JSON.stringify([...original].sort()),
      `Failed to restore original permissions: ${JSON.stringify(restored.data.permissions)}`,
    );

    console.log('user permissions RPC: ok');
  } finally {
    await adminClient.rpc('inventory_admin_update_user', {
      p_user_id: cashierProfile.id,
      p_permissions: original,
    });
    await adminClient.auth.signOut();
    await cashierClient.auth.signOut();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

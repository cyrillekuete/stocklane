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

async function main() {
  const env = loadEnv(path.join(__dirname, '..', '.env'));
  const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

  for (const account of [
    { email: 'admin@stocklane.local', password: 'Admin123', role: 'admin' },
    { email: 'cashier@stocklane.local', password: 'Cashier123', role: 'cashier' },
    { email: 'keeper@stocklane.local', password: 'Keeper123', role: 'store_keeper' },
  ]) {
    const { data, error } = await client.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    });
    if (error) throw new Error(`${account.email}: ${error.message}`);
    const appRole = data.user?.app_metadata?.role;
    const { data: profile, error: profileError } = await client
      .from('inventory_profiles')
      .select('email, role, status')
      .eq('id', data.user.id)
      .single();
    if (profileError) throw new Error(`${account.email} profile: ${profileError.message}`);
    console.log('OK', account.email, 'jwt_role=', appRole, 'profile=', profile);
    if (appRole !== account.role || profile.role !== account.role) {
      throw new Error(`Role mismatch for ${account.email}`);
    }
    await client.auth.signOut();
  }

  // Admin can list all profiles
  await client.auth.signInWithPassword({
    email: 'admin@stocklane.local',
    password: 'Admin123',
  });
  const { data: all, error: listError } = await client
    .from('inventory_profiles')
    .select('email, role');
  if (listError) throw listError;
  console.log('Admin sees', all.length, 'profiles');
  await client.auth.signOut();

  // Cashier should only see self
  await client.auth.signInWithPassword({
    email: 'cashier@stocklane.local',
    password: 'Cashier123',
  });
  const { data: limited, error: limitedError } = await client
    .from('inventory_profiles')
    .select('email, role');
  if (limitedError) throw limitedError;
  console.log('Cashier sees', limited.length, 'profiles', limited.map((r) => r.email));
  await client.auth.signOut();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

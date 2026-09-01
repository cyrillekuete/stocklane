const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

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
  const productId = `test_create_prod_${suffix}`;
  const sku = `SKU-CREATE-${suffix}`;
  const name = `Create Product Test ${suffix}`;
  
  // Find an active warehouse
  const whRes = await client.query("SELECT id FROM inventory_warehouses WHERE status = 'Active' LIMIT 1");
  if (whRes.rowCount === 0) {
    throw new Error('No active warehouse found in database. Run seeds first.');
  }
  const warehouseId = whRes.rows[0].id;
  
  try {
    await client.query('BEGIN');

    const payload = {
      id: productId,
      name: name,
      sku: sku,
      barcode: `BC-${suffix}`,
      description: 'Test product description',
      price: 29.99,
      status: 'Live',
      featured: true,
      tags: ['test', 'create-rpc'],
      image: '11.png',
      full_name: name,
      warehouse_id: warehouseId,
      variants: [
        {
          id: `var-s-${suffix}`,
          size: 'S',
          color: 'Red',
          price: 29.99,
          available: true
        },
        {
          id: `var-m-${suffix}`,
          size: 'M',
          color: 'Red',
          price: 34.99,
          available: true
        }
      ]
    };

    console.log('Invoking inventory_create_product RPC...');
    const rpcRes = await client.query('SELECT inventory_create_product($1::jsonb) AS result', [JSON.stringify(payload)]);
    const returnedId = rpcRes.rows[0].result;
    console.log(`Returned ID: ${returnedId}`);
    if (returnedId !== productId) {
      throw new Error(`Expected returned ID to be ${productId}, got ${returnedId}`);
    }

    // Verify inventory_products
    const prodRes = await client.query('SELECT * FROM inventory_products WHERE id = $1', [productId]);
    if (prodRes.rowCount === 0) {
      throw new Error('Product not found in inventory_products');
    }
    const product = prodRes.rows[0];
    if (product.name !== name || product.sku !== sku || parseFloat(product.price) !== 29.99) {
      throw new Error('Product field values do not match input payload');
    }
    console.log('✔ inventory_products verified');

    // Verify inventory_stock_levels
    const slRes = await client.query('SELECT * FROM inventory_stock_levels WHERE product_id = $1', [productId]);
    if (slRes.rowCount === 0) {
      throw new Error('Stock level record not created for the product');
    }
    console.log('✔ inventory_stock_levels verified');

    // Verify inventory_warehouse_stock
    const wsRes = await client.query('SELECT * FROM inventory_warehouse_stock WHERE product_id = $1 AND warehouse_id = $2', [productId, warehouseId]);
    if (wsRes.rowCount === 0) {
      throw new Error('Warehouse stock record not created for the product');
    }
    console.log('✔ inventory_warehouse_stock verified');

    // Verify inventory_product_variants
    const varRes = await client.query('SELECT * FROM inventory_product_variants WHERE product_id = $1 ORDER BY size', [productId]);
    if (varRes.rowCount !== 2) {
      throw new Error(`Expected 2 variants, found ${varRes.rowCount}`);
    }
    // Size M comes before S alphabetically
    const varM = varRes.rows[0];
    const varS = varRes.rows[1];
    if (varM.size !== 'M' || varM.color !== 'Red' || parseFloat(varM.price) !== 34.99) {
      throw new Error('Variant M does not match input values');
    }
    if (varS.size !== 'S' || varS.color !== 'Red' || parseFloat(varS.price) !== 29.99) {
      throw new Error('Variant S does not match input values');
    }
    console.log('✔ inventory_product_variants verified');

    await client.query('ROLLBACK');
    console.log('Transaction rolled back successfully.');
    console.log('All tests passed.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Test failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(console.error);

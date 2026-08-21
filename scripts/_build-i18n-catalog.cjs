const fs = require('fs');
const path = require('path');

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(tsx|ts)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

const ignorePath = (f) =>
  /[\\/]data[\\/]/.test(f) ||
  /[\\/]types[\\/]/.test(f) ||
  /[\\/]services[\\/]/.test(f) ||
  /query-keys\.ts$/.test(f) ||
  /format\.ts$/.test(f) ||
  /order-pricing\.ts$/.test(f) ||
  /optimistic\.ts$/.test(f) ||
  /context\.tsx$/.test(f) ||
  /auth-context\.ts$/.test(f) ||
  /models\.ts$/.test(f) ||
  /helpers\.ts$/.test(f) ||
  /index\.ts$/.test(f);

const roots = ['src/auth', 'src/store-inventory'];
const files = roots.flatMap((r) => walk(r)).filter((f) => !ignorePath(f));

const patterns = [
  /(?:placeholder|title|label|description|defaultMessage|alt|aria-label)=["']([^"']{2,})["']/g,
  /DataGridColumnHeader\s+title=["']([^"']+)["']/g,
  /toast\.(?:success|error|info|warning)\(\s*["']([^"']+)["']/g,
  /toast\.(?:success|error)\(\s*`([^`$]+(?:\$\{[^}]+\}[^`$]*)*)`/g,
  /(?:SheetTitle|DialogTitle|AlertTitle|CardTitle|CardHeading|DialogDescription|SheetDescription|AlertDialogTitle|AlertDialogDescription|ToolbarHeading)[^>]*>\s*([^<{]+?)\s*</g,
  /<(?:Button|Label|FormLabel|Badge|SelectItem|DropdownMenuItem|CommandEmpty)[^>]*>\s*([^<{]+?)\s*</g,
  />\s*([A-Z][A-Za-z0-9 ,.'!?%&/()+:-]{2,120})\s*</g,
  /message:\s*["']([^"']+)["']/g,
  /throw new Error\(\s*["']([^"']+)["']/g,
  /new Error\(\s*["']([^"']+)["']/g,
  /fallback\s*=\s*["']([^"']+)["']/g,
  /header:\s*["']([^"']+)["']/g,
  /heading:\s*["']([^"']+)["']/g,
  /label:\s*["']([^"']+)["']/g,
  /ROLE_LABELS[\s\S]*?};\s/g, // handled separately
];

// Also pull multiline JSX text poorly captured
const multilineHints = [
  /You do not have access to this area[\s\S]*?Management\./,
  /Sign in to manage inventory[\s\S]*?Store Keeper\./,
  /Demo:[\s\S]*?password pattern\./,
  /Your password has been successfully reset[\s\S]*?password\./,
  /Password reset link sent to[\s\S]*?folder\./,
  /Cashier & Store Keeper[\s\S]*?pattern\./,
  /No Active warehouses[\s\S]*?POS\./,
];

const skip =
  /^(className|flex|grid|text-|bg-|border|w-|h-|p-|m-|gap-|size-|absolute|relative|hidden|block|inline|from-|to-|via-|sm:|md:|lg:|xl:|dark:|hover:|focus:|Default Logo|Mini Logo|Default Dark Logo|Promise|uppercase text|Metronic)/;

const noise = new Set([
  'Promise',
  'Admin123',
  'Demo:',
  'Stocklane',
  'setIsCreateCategoryOpen(true)}>',
]);

function domainFor(file, str) {
  const f = file.replace(/\\/g, '/').toLowerCase();
  if (f.includes('/auth/')) return 'AUTH';
  if (f.includes('app.config')) return 'MENU';
  if (f.includes('/roles.ts')) return 'ROLES/PERMISSIONS';
  if (f.includes('/layout/')) return 'LAYOUT';
  if (f.includes('order-status') || f.includes('category-validation') || f.includes('payment-methods'))
    return 'STATUS';
  if (
    f.includes('-errors') ||
    f.includes('settings-validation') ||
    f.includes('/hooks/') ||
    /toast\./.test(str) ||
    f.includes('pos.ts')
  )
    return 'TOASTS/ERRORS';
  if (f.includes('dashboard')) return 'DASHBOARD';
  if (f.includes('warehouse')) return 'WAREHOUSES';
  if (f.includes('/pos') || f.includes('pos-')) return 'POS';
  if (f.includes('product') || f.includes('variant') || f.includes('manage-variant')) return 'PRODUCTS';
  if (f.includes('categor')) return 'CATEGORIES';
  if (f.includes('order') || f.includes('shipping') || f.includes('track-shipping') || f.includes('create-shipping'))
    return 'ORDERS';
  if (f.includes('customer')) return 'CUSTOMERS';
  if (f.includes('/users')) return 'USERS';
  if (f.includes('settings')) return 'SETTINGS';
  if (
    f.includes('stock') ||
    f.includes('inbound') ||
    f.includes('outbound') ||
    f.includes('all-stock') ||
    f.includes('per-product') ||
    f.includes('receive-stock') ||
    f.includes('ship-stock')
  )
    return 'INVENTORY';
  return 'COMMON';
}

const byDomain = {};
const seenGlobal = new Map(); // key -> {str, files, key hint}

function suggestKey(domain, str) {
  const slug = str
    .replace(/\{[^}]+\}/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase()
    .slice(0, 60);
  return `${domain.replace(/\//g, '.')}.${slug || 'TEXT'}`;
}

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const rel = file.replace(/\\/g, '/');
  const found = new Set();

  for (const re of patterns) {
    if (re.source.includes('ROLE_LABELS')) continue;
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      let s = (m[1] || '').trim().replace(/\s+/g, ' ');
      if (!s || s.length < 2) continue;
      if (skip.test(s)) continue;
      if (noise.has(s)) continue;
      if (/^[\d\s./:_+-]+$/.test(s)) continue;
      if (/^[a-z][a-z0-9_/.-]*$/.test(s) && s.length < 20) continue;
      if (s.includes('className') || s.includes('=>') || s.includes('{')) continue;
      if (s.startsWith('(') || s.includes('setIs')) continue;
      found.add(s);
    }
  }

  for (const re of multilineHints) {
    const m = text.match(re);
    if (m) found.add(m[0].replace(/\s+/g, ' ').trim());
  }

  // ROLE labels specially
  if (rel.endsWith('auth/lib/roles.ts')) {
    const roleLabels = [...text.matchAll(/(\w+):\s*'([^']+)'/g)];
    for (const [, , label] of roleLabels) found.add(label);
  }

  // MENU titles
  if (rel.endsWith('app.config.tsx')) {
    for (const m of text.matchAll(/(?:title|heading):\s*'([^']+)'/g)) found.add(m[1]);
  }

  for (const s of found) {
    const domain = domainFor(rel, s);
    if (!byDomain[domain]) byDomain[domain] = [];
    const key = `${domain}::${s}`;
    if (seenGlobal.has(key)) {
      seenGlobal.get(key).files.add(rel);
      continue;
    }
    const entry = {
      key: suggestKey(domain, s),
      en: s,
      files: new Set([rel]),
    };
    seenGlobal.set(key, entry);
    byDomain[domain].push(entry);
  }
}

// serialize
const out = {};
for (const domain of Object.keys(byDomain).sort()) {
  out[domain] = byDomain[domain]
    .map((e) => ({
      key: e.key,
      en: e.en,
      files: [...e.files].sort(),
    }))
    .sort((a, b) => a.en.localeCompare(b.en));
}

fs.writeFileSync('scripts/_i18n-catalog.json', JSON.stringify(out, null, 2), 'utf8');

let md = ['# Stocklane i18n string catalog (auth + store-inventory)', ''];
let total = 0;
for (const [domain, items] of Object.entries(out)) {
  total += items.length;
  md.push(`## ${domain}`, '');
  for (const item of items) {
    const fileHint = item.files[0].replace(/^src\//, '');
    md.push(`- \`${item.key}\`: "${item.en}"`);
    md.push(`  - ${item.files.map((f) => f.replace(/^src\//, '')).join(', ')}`);
  }
  md.push('');
}
md.push(`Total unique strings: ${total}`);
fs.writeFileSync('scripts/_i18n-catalog.md', md.join('\n'), 'utf8');
console.log(`Catalog: ${total} unique strings across ${Object.keys(out).length} domains`);
for (const [d, items] of Object.entries(out)) console.log(`  ${d}: ${items.length}`);

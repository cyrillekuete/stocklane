const fs = require('fs');
const c = require('./_i18n-catalog.json');

const noise = (s) =>
  /^\/store-inventory/.test(s) ||
  s === 'Passwords don' ||
  /className|uppercase text|setIsCreate|Promise|Admin123|Demo:/.test(s) ||
  /^Sep |^Week |^Aug /.test(s) ||
  (/@/.test(s) && s.includes('.')) ||
  /^[A-Z]{2}-\d/.test(s);

const prefer = {
  Save: 'COMMON.SAVE',
  Cancel: 'COMMON.CANCEL',
  Delete: 'COMMON.DELETE',
  Edit: 'COMMON.EDIT',
  Search: 'COMMON.SEARCH',
  Close: 'COMMON.CLOSE',
  Add: 'COMMON.ADD',
  Create: 'COMMON.CREATE',
  Update: 'COMMON.UPDATE',
  Back: 'COMMON.BACK',
  Export: 'COMMON.EXPORT',
  'Filter...': 'COMMON.FILTER',
  'Search...': 'COMMON.SEARCH_ELLIPSIS',
  'Loading...': 'COMMON.LOADING',
  'Saving...': 'COMMON.SAVING',
  Active: 'STATUS.ACTIVE',
  Inactive: 'STATUS.INACTIVE',
  Draft: 'STATUS.DRAFT',
  Archived: 'STATUS.ARCHIVED',
  Live: 'STATUS.LIVE',
  Pending: 'STATUS.PENDING',
  Paid: 'STATUS.PAID',
  Unpaid: 'STATUS.UNPAID',
  Failed: 'STATUS.FAILED',
  Cancelled: 'STATUS.CANCELLED',
  Canceled: 'STATUS.CANCELED',
  Packed: 'STATUS.PACKED',
  Shipped: 'STATUS.SHIPPED',
  Delivered: 'STATUS.DELIVERED',
  'On Hold': 'STATUS.ON_HOLD',
  Returned: 'STATUS.RETURNED',
  Invited: 'STATUS.INVITED',
  Cash: 'STATUS.PAYMENT_CASH',
  Account: 'STATUS.PAYMENT_ACCOUNT',
  Credit: 'STATUS.PAYMENT_CREDIT',
  'MTN Mobile Money': 'STATUS.PAYMENT_MTN',
  'Orange Money': 'STATUS.PAYMENT_ORANGE',
  'Bank Transfer': 'STATUS.PAYMENT_BANK',
  Card: 'STATUS.PAYMENT_CARD',
  Mobile: 'STATUS.PAYMENT_MOBILE',
};

function niceKey(domain, en) {
  if (prefer[en]) return prefer[en];
  const slug = en
    .replace(/\$\{[^}]+\}/g, 'X')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase()
    .slice(0, 55);
  return `${domain.replace(/\//g, '.')}.${slug}`;
}

const out = {};
let n = 0;
for (const [domain, items] of Object.entries(c)) {
  out[domain] = [];
  for (const item of items) {
    if (noise(item.en)) continue;
    if (item.en.length > 180) continue;
    out[domain].push({ key: niceKey(domain, item.en), en: item.en, files: item.files });
    n++;
  }
}

fs.writeFileSync('./i18n-string-catalog.json', JSON.stringify(out, null, 2));
const lines = ['domain\tkey\ten\tfiles'];
for (const [domain, items] of Object.entries(out)) {
  for (const i of items) {
    lines.push([domain, i.key, JSON.stringify(i.en), i.files.join('|')].join('\t'));
  }
}
fs.writeFileSync('./i18n-string-catalog.tsv', lines.join('\n'));

let md = [
  '# Stocklane EN string catalog (auth + store-inventory)',
  '',
  'Scope: `src/auth/**` + `src/store-inventory/**` only. Mock `data/` files excluded.',
  `Generated unique UI strings: **${n}**`,
  '',
];
for (const [domain, items] of Object.entries(out)) {
  md.push(`## ${domain}`, '');
  for (const i of items) {
    const files = i.files.map((f) => f.replace(/^src\//, '')).join(', ');
    md.push(`- \`${i.key}\` — "${i.en.replace(/"/g, '\\"')}"`);
    md.push(`  - _${files}_`);
  }
  md.push('');
}
fs.writeFileSync('./i18n-string-catalog.md', md.join('\n'));
console.log('cleaned', n);
for (const [d, items] of Object.entries(out)) console.log(d, items.length);

export function stableId(prefix: string, value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${prefix}_${slug || 'item'}`;
}

export function parseMoney(value: string | number | null | undefined) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatMoney(value: string | number | null | undefined) {
  const amount = parseMoney(value);
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function parseQty(value: string | number | null | undefined) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

export function generateCustomerCode() {
  const digits = String(Math.floor(100000 + Math.random() * 900000));
  const letters = `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
  return `${digits}-${letters}`;
}

export function generateOrderNumber() {
  const region = `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
  const digits = String(Math.floor(1000 + Math.random() * 9000));
  return `SO-${region}-${digits}`;
}

export function generateSaleNumber() {
  const digits = String(Math.floor(100000 + Math.random() * 900000));
  return `POS-${digits}`;
}

export function parseOrderDate(value?: string | null) {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
}

export function isRemoteAsset(value?: string | null) {
  if (!value) return false;
  return value.startsWith('data:') || value.startsWith('blob:') || value.startsWith('http://') || value.startsWith('https://');
}

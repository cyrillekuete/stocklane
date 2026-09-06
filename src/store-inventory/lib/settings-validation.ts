import { z } from 'zod';
import { APP_CURRENCY } from './format';
import type { ContactChannel, ShippingZone, StoreLocation, StoreSettings } from '../types';

export const LOGO_MAX_CHARS = 700_000; // ~500KB data URL ceiling
export const TAX_PERCENT_MIN = 0;
export const TAX_PERCENT_MAX = 100;
export const SESSION_TIMEOUT_MIN = 5;
export const SESSION_TIMEOUT_MAX = 1440;
export const PASSWORD_MIN_LENGTH_MIN = 6;
export const PASSWORD_MIN_LENGTH_MAX = 128;

export const STORE_STATUSES = ['Live', 'Draft', 'Archived'] as const;
export type StoreStatus = (typeof STORE_STATUSES)[number];

const optionalEmail = z
  .union([z.string().email('Enter a valid email'), z.literal(''), z.null()])
  .transform((value) => (value === '' || value == null ? null : value));

const contactChannelSchema = z.object({
  provider: z.string().trim().min(1),
  handle: z.string().default(''),
});

const shippingZoneSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, 'Shipping zone name is required'),
  countries: z.array(z.string()).default([]),
  rate: z.number().finite().min(0, 'Shipping rate cannot be negative'),
  estimatedDays: z.string().default('5-7'),
});

const storeLocationSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, 'Location name is required'),
  address: z.string().default(''),
  city: z.string().default(''),
  country: z.string().default(''),
  phone: z.string().default(''),
  isDefault: z.boolean().default(false),
});

export const storeSettingsSchema = z.object({
  id: z.string().min(1),
  storeName: z.string().trim().min(1, 'Store name is required').max(120, 'Store name is too long'),
  storeCode: z.string().trim().min(1, 'Store code is required').max(64),
  status: z.string().trim().min(1, 'Status is required').default('Live'),
  establishedAt: z
    .string()
    .min(1, 'Established date is required')
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: 'Enter a valid date',
    }),
  logo: z
    .string()
    .nullable()
    .refine((value) => value == null || value.length <= LOGO_MAX_CHARS, {
      message: 'Logo is too large (max ~500KB)',
    }),
  storeUrl: z.string().nullable(),
  phone: z.string().nullable(),
  contactEmail: optionalEmail,
  tags: z.array(z.string()),
  automaticTimeZone: z.boolean(),
  timeZone: z.string(),
  language: z.string(),
  dateFormat: z.string(),
  aiSemanticSearch: z.boolean(),
  aiInsight: z.boolean(),
  contactChannels: z.array(contactChannelSchema),
  currency: z.literal(APP_CURRENCY).or(z.string()).transform(() => APP_CURRENCY),
  cardMethods: z.array(z.string()),
  applePay: z.boolean(),
  googlePay: z.boolean(),
  paypal: z.boolean(),
  taxRateScope: z.enum(['country', 'state', 'city']),
  taxCalculation: z.enum(['inclusive', 'exclusive']),
  taxPercent: z
    .number()
    .finite()
    .min(TAX_PERCENT_MIN, 'Tax percent must be between 0 and 100')
    .max(TAX_PERCENT_MAX, 'Tax percent must be between 0 and 100'),
  automaticInvoice: z.boolean(),
  noReplyEmail: optionalEmail,
  guestCheckout: z.boolean(),
  collectPhone: z.boolean(),
  orderNotes: z.boolean(),
  termsRequired: z.boolean(),
  abandonedCartEmail: z.boolean(),
  defaultCheckoutCountry: z.string().min(1),
  freeShippingEnabled: z.boolean(),
  freeShippingMin: z.number().finite().min(0, 'Free shipping minimum cannot be negative'),
  localPickup: z.boolean(),
  expressShipping: z.boolean(),
  shippingOrigin: z.string().nullable(),
  defaultCarrier: z.string().nullable(),
  handlingDays: z.number().int().min(0, 'Handling days cannot be negative'),
  shippingZones: z.array(shippingZoneSchema),
  locations: z.array(storeLocationSchema),
  twoFactorRequired: z.boolean(),
  sessionTimeoutMinutes: z
    .number()
    .int()
    .min(SESSION_TIMEOUT_MIN, `Session timeout must be at least ${SESSION_TIMEOUT_MIN} minutes`)
    .max(SESSION_TIMEOUT_MAX, `Session timeout must be at most ${SESSION_TIMEOUT_MAX} minutes`),
  loginAlerts: z.boolean(),
  passwordMinLength: z
    .number()
    .int()
    .min(PASSWORD_MIN_LENGTH_MIN, `Password length must be at least ${PASSWORD_MIN_LENGTH_MIN}`)
    .max(PASSWORD_MIN_LENGTH_MAX, `Password length must be at most ${PASSWORD_MIN_LENGTH_MAX}`),
  requireStrongPassword: z.boolean(),
  emailOrderConfirm: z.boolean(),
  emailShippingUpdates: z.boolean(),
  emailLowStock: z.boolean(),
  emailNewCustomer: z.boolean(),
  smsOrderUpdates: z.boolean(),
  notifyEmail: optionalEmail,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export function clampTaxPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(TAX_PERCENT_MAX, Math.max(TAX_PERCENT_MIN, value));
}

export function clampSessionTimeout(value: number) {
  if (!Number.isFinite(value)) return SESSION_TIMEOUT_MIN;
  return Math.min(SESSION_TIMEOUT_MAX, Math.max(SESSION_TIMEOUT_MIN, Math.trunc(value)));
}

export function clampPasswordMinLength(value: number) {
  if (!Number.isFinite(value)) return PASSWORD_MIN_LENGTH_MIN;
  return Math.min(PASSWORD_MIN_LENGTH_MAX, Math.max(PASSWORD_MIN_LENGTH_MIN, Math.trunc(value)));
}

export function clampNonNegativeNumber(value: number, fallback = 0) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, value);
}

function normalizeContactChannels(channels: ContactChannel[]): ContactChannel[] {
  const seen = new Set<string>();
  const next: ContactChannel[] = [];
  for (const channel of channels) {
    const provider = channel.provider.trim();
    if (!provider) continue;
    const key = provider.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push({ provider, handle: channel.handle?.trim() ?? '' });
  }
  return next;
}

function normalizeShippingZones(zones: ShippingZone[]): ShippingZone[] {
  return zones
    .map((zone) => ({
      ...zone,
      name: zone.name.trim(),
      rate: clampNonNegativeNumber(zone.rate),
      countries: Array.isArray(zone.countries) ? zone.countries : [],
      estimatedDays: zone.estimatedDays?.trim() || '5-7',
    }))
    .filter((zone) => zone.name.length > 0);
}

function normalizeLocations(locations: StoreLocation[]): StoreLocation[] {
  const cleaned = locations
    .map((location) => ({
      ...location,
      name: location.name.trim(),
      address: location.address ?? '',
      city: location.city ?? '',
      country: location.country ?? '',
      phone: location.phone ?? '',
      isDefault: Boolean(location.isDefault),
    }))
    .filter((location) => location.name.length > 0);

  if (cleaned.length === 0) return cleaned;

  const firstDefaultIndex = cleaned.findIndex((location) => location.isDefault);
  const defaultIndex = firstDefaultIndex >= 0 ? firstDefaultIndex : 0;
  return cleaned.map((location, index) => ({
    ...location,
    isDefault: index === defaultIndex,
  }));
}

/** Stable stringify for dirty detection (sorted object keys recursively). */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return `{${entries.map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`).join(',')}}`;
}

export function settingsAreEqual(a: StoreSettings, b: StoreSettings) {
  return stableStringify(a) === stableStringify(b);
}

export function normalizeStoreSettingsInput(input: StoreSettings): StoreSettings {
  const taxScope = ['country', 'state', 'city'].includes(input.taxRateScope)
    ? (input.taxRateScope as 'country' | 'state' | 'city')
    : 'country';
  const taxCalculation =
    input.taxCalculation === 'exclusive' || input.taxCalculation === 'inclusive'
      ? input.taxCalculation
      : 'inclusive';

  return {
    ...input,
    storeName: input.storeName.trim(),
    storeCode: input.storeCode.trim(),
    currency: APP_CURRENCY,
    taxRateScope: taxScope,
    taxCalculation,
    taxPercent: clampTaxPercent(input.taxPercent),
    freeShippingMin: clampNonNegativeNumber(input.freeShippingMin),
    handlingDays: Math.max(0, Math.trunc(clampNonNegativeNumber(input.handlingDays, 1))),
    sessionTimeoutMinutes: clampSessionTimeout(input.sessionTimeoutMinutes),
    passwordMinLength: clampPasswordMinLength(input.passwordMinLength),
    contactEmail: input.contactEmail?.trim() || null,
    noReplyEmail: input.noReplyEmail?.trim() || null,
    notifyEmail: input.notifyEmail?.trim() || null,
    storeUrl: input.storeUrl?.trim() || null,
    phone: input.phone?.trim() || null,
    shippingOrigin: input.shippingOrigin?.trim() || null,
    defaultCarrier: input.defaultCarrier?.trim() || null,
    logo: input.logo || null,
    contactChannels: normalizeContactChannels(input.contactChannels ?? []),
    shippingZones: normalizeShippingZones(input.shippingZones ?? []),
    locations: normalizeLocations(input.locations ?? []),
  };
}

export function parseStoreSettings(input: StoreSettings): StoreSettings {
  const normalized = normalizeStoreSettingsInput(input);
  return storeSettingsSchema.parse(normalized) as StoreSettings;
}

export function formatZodSettingsError(error: unknown): string {
  if (error && typeof error === 'object' && 'issues' in error) {
    const issues = (error as z.ZodError).issues;
    if (issues[0]?.message) return issues[0].message;
  }
  if (error instanceof Error) return error.message;
  return 'Invalid settings';
}

/**
 * Validate a raw draft (no clamping/normalization) and map the first issue
 * per field to a key addressable by the settings form.
 * Nested keys: `shippingZone:<id>:name|rate|estimatedDays`, `location:<id>:name`.
 */
export function getSettingsFieldErrors(input: StoreSettings): Record<string, string> {
  const result = storeSettingsSchema.safeParse(input);
  if (result.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path as Array<string | number>;
    const root = path[0];
    let key: string | null = null;
    if (typeof root === 'string' && path.length === 1) {
      key = root;
    } else if (root === 'shippingZones' && typeof path[1] === 'number') {
      const zone = input.shippingZones?.[path[1] as number];
      const sub = typeof path[2] === 'string' ? (path[2] as string) : 'name';
      key = `shippingZone:${zone?.id ?? (path[1] as number)}:${sub}`;
    } else if (root === 'locations' && typeof path[1] === 'number') {
      const location = input.locations?.[path[1] as number];
      key = `location:${location?.id ?? (path[1] as number)}:name`;
    } else if (typeof root === 'string') {
      key = root;
    }
    if (key && !errors[key]) {
      errors[key] = issue.message;
    }
  }
  return errors;
}

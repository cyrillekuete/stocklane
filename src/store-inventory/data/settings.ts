import { stableId } from '../lib/format';
import type {
  ContactChannel,
  ShippingZone,
  StoreLocation,
  StoreSettings,
} from '../types';

export const STORE_SETTINGS_ID = stableId('settings', 'default');

export const defaultContactChannels: ContactChannel[] = [
  { provider: 'github', handle: 'KeenThemes' },
  { provider: 'linkedin', handle: 'KeenThemes' },
  { provider: 'figma', handle: 'KeenThemes' },
  { provider: 'twitch', handle: '' },
  { provider: 'slack', handle: '' },
];

export const defaultShippingZones: ShippingZone[] = [
  {
    id: stableId('zone', 'eu'),
    name: 'European Union',
    countries: ['FR', 'DE', 'NL', 'BE', 'IT', 'ES'],
    rate: 8.5,
    estimatedDays: '3-5',
  },
  {
    id: stableId('zone', 'us'),
    name: 'United States',
    countries: ['US'],
    rate: 14.0,
    estimatedDays: '5-8',
  },
];

export const defaultStoreLocations: StoreLocation[] = [
  {
    id: stableId('loc', 'paris-hq'),
    name: 'Paris HQ',
    address: '12 Rue de Rivoli',
    city: 'Paris',
    country: 'FR',
    phone: '+33123456789',
    isDefault: true,
  },
];

export const defaultStoreSettings: StoreSettings = {
  id: STORE_SETTINGS_ID,
  storeName: "Bob's Shoes Store",
  storeCode: '583920-XT',
  status: 'Live',
  establishedAt: '2022-01-16T00:00:00.000Z',
  logo: '/media/avatars/300-1.png',
  storeUrl: 'bobs-shoes.store',
  phone: '+33',
  contactEmail: 'hello@bobs-shoes.store',
  tags: ['shoes', 'footwear', 'retail'],
  automaticTimeZone: true,
  timeZone: 'GMT +01:00',
  language: 'en-us',
  dateFormat: 'DD/MM/YYYY',
  aiSemanticSearch: false,
  aiInsight: true,
  contactChannels: defaultContactChannels,
  currency: 'EUR',
  cardMethods: ['visa', 'ideal'],
  applePay: true,
  googlePay: false,
  paypal: false,
  taxRateScope: 'country',
  taxCalculation: 'inclusive',
  taxPercent: 20,
  automaticInvoice: false,
  noReplyEmail: 'no-reply@bobs-shoes.store',
  guestCheckout: true,
  collectPhone: true,
  orderNotes: true,
  termsRequired: true,
  abandonedCartEmail: true,
  defaultCheckoutCountry: 'FR',
  freeShippingEnabled: true,
  freeShippingMin: 75,
  localPickup: true,
  expressShipping: false,
  shippingOrigin: 'Paris, FR',
  defaultCarrier: 'DHL',
  handlingDays: 1,
  shippingZones: defaultShippingZones,
  locations: defaultStoreLocations,
  twoFactorRequired: false,
  sessionTimeoutMinutes: 30,
  loginAlerts: true,
  passwordMinLength: 8,
  requireStrongPassword: true,
  emailOrderConfirm: true,
  emailShippingUpdates: true,
  emailLowStock: true,
  emailNewCustomer: false,
  smsOrderUpdates: false,
  notifyEmail: 'ops@bobs-shoes.store',
  createdAt: '2022-01-16T00:00:00.000Z',
  updatedAt: '2022-01-16T00:00:00.000Z',
};

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function asStringOrNull(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function asStringArray(value: unknown, fallback: string[] = []) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : fallback;
}

function asJsonArray<T>(value: unknown, fallback: T[]): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? (parsed as T[]) : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function storeSettingsToRow(settings: StoreSettings): Record<string, unknown> {
  return {
    id: settings.id,
    store_name: settings.storeName,
    store_code: settings.storeCode,
    status: settings.status,
    established_at: settings.establishedAt,
    logo: settings.logo,
    store_url: settings.storeUrl,
    phone: settings.phone,
    contact_email: settings.contactEmail,
    tags: settings.tags,
    automatic_time_zone: settings.automaticTimeZone,
    time_zone: settings.timeZone,
    language: settings.language,
    date_format: settings.dateFormat,
    ai_semantic_search: settings.aiSemanticSearch,
    ai_insight: settings.aiInsight,
    contact_channels: settings.contactChannels,
    currency: settings.currency,
    card_methods: settings.cardMethods,
    apple_pay: settings.applePay,
    google_pay: settings.googlePay,
    paypal: settings.paypal,
    tax_rate_scope: settings.taxRateScope,
    tax_calculation: settings.taxCalculation,
    tax_percent: settings.taxPercent,
    automatic_invoice: settings.automaticInvoice,
    no_reply_email: settings.noReplyEmail,
    guest_checkout: settings.guestCheckout,
    collect_phone: settings.collectPhone,
    order_notes: settings.orderNotes,
    terms_required: settings.termsRequired,
    abandoned_cart_email: settings.abandonedCartEmail,
    default_checkout_country: settings.defaultCheckoutCountry,
    free_shipping_enabled: settings.freeShippingEnabled,
    free_shipping_min: settings.freeShippingMin,
    local_pickup: settings.localPickup,
    express_shipping: settings.expressShipping,
    shipping_origin: settings.shippingOrigin,
    default_carrier: settings.defaultCarrier,
    handling_days: settings.handlingDays,
    shipping_zones: settings.shippingZones,
    locations: settings.locations,
    two_factor_required: settings.twoFactorRequired,
    session_timeout_minutes: settings.sessionTimeoutMinutes,
    login_alerts: settings.loginAlerts,
    password_min_length: settings.passwordMinLength,
    require_strong_password: settings.requireStrongPassword,
    email_order_confirm: settings.emailOrderConfirm,
    email_shipping_updates: settings.emailShippingUpdates,
    email_low_stock: settings.emailLowStock,
    email_new_customer: settings.emailNewCustomer,
    sms_order_updates: settings.smsOrderUpdates,
    notify_email: settings.notifyEmail,
  };
}

export function storeSettingsFromRow(row: Record<string, unknown>): StoreSettings {
  return {
    id: asString(row.id, STORE_SETTINGS_ID),
    storeName: asString(row.store_name, defaultStoreSettings.storeName),
    storeCode: asString(row.store_code, defaultStoreSettings.storeCode),
    status: asString(row.status, 'Live'),
    establishedAt: asString(row.established_at, defaultStoreSettings.establishedAt),
    logo: asStringOrNull(row.logo) ?? defaultStoreSettings.logo,
    storeUrl: asStringOrNull(row.store_url),
    phone: asStringOrNull(row.phone),
    contactEmail: asStringOrNull(row.contact_email),
    tags: asStringArray(row.tags, defaultStoreSettings.tags),
    automaticTimeZone: asBoolean(row.automatic_time_zone, true),
    timeZone: asString(row.time_zone, defaultStoreSettings.timeZone),
    language: asString(row.language, defaultStoreSettings.language),
    dateFormat: asString(row.date_format, defaultStoreSettings.dateFormat),
    aiSemanticSearch: asBoolean(row.ai_semantic_search, false),
    aiInsight: asBoolean(row.ai_insight, true),
    contactChannels: asJsonArray<ContactChannel>(row.contact_channels, defaultContactChannels),
    currency: asString(row.currency, 'EUR'),
    cardMethods: asStringArray(row.card_methods, defaultStoreSettings.cardMethods),
    applePay: asBoolean(row.apple_pay, true),
    googlePay: asBoolean(row.google_pay, false),
    paypal: asBoolean(row.paypal, false),
    taxRateScope: asString(row.tax_rate_scope, 'country'),
    taxCalculation: asString(row.tax_calculation, 'inclusive'),
    taxPercent: asNumber(row.tax_percent, 20),
    automaticInvoice: asBoolean(row.automatic_invoice, false),
    noReplyEmail: asStringOrNull(row.no_reply_email),
    guestCheckout: asBoolean(row.guest_checkout, true),
    collectPhone: asBoolean(row.collect_phone, true),
    orderNotes: asBoolean(row.order_notes, true),
    termsRequired: asBoolean(row.terms_required, true),
    abandonedCartEmail: asBoolean(row.abandoned_cart_email, true),
    defaultCheckoutCountry: asString(row.default_checkout_country, 'FR'),
    freeShippingEnabled: asBoolean(row.free_shipping_enabled, true),
    freeShippingMin: asNumber(row.free_shipping_min, 75),
    localPickup: asBoolean(row.local_pickup, true),
    expressShipping: asBoolean(row.express_shipping, false),
    shippingOrigin: asStringOrNull(row.shipping_origin),
    defaultCarrier: asStringOrNull(row.default_carrier),
    handlingDays: asNumber(row.handling_days, 1),
    shippingZones: asJsonArray<ShippingZone>(row.shipping_zones, defaultShippingZones),
    locations: asJsonArray<StoreLocation>(row.locations, defaultStoreLocations),
    twoFactorRequired: asBoolean(row.two_factor_required, false),
    sessionTimeoutMinutes: asNumber(row.session_timeout_minutes, 30),
    loginAlerts: asBoolean(row.login_alerts, true),
    passwordMinLength: asNumber(row.password_min_length, 8),
    requireStrongPassword: asBoolean(row.require_strong_password, true),
    emailOrderConfirm: asBoolean(row.email_order_confirm, true),
    emailShippingUpdates: asBoolean(row.email_shipping_updates, true),
    emailLowStock: asBoolean(row.email_low_stock, true),
    emailNewCustomer: asBoolean(row.email_new_customer, false),
    smsOrderUpdates: asBoolean(row.sms_order_updates, false),
    notifyEmail: asStringOrNull(row.notify_email),
    createdAt: asString(row.created_at, defaultStoreSettings.createdAt),
    updatedAt: asString(row.updated_at, defaultStoreSettings.updatedAt),
  };
}

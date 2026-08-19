import type {
  CustomerListRow,
  CustomerPaymentMethod,
  CustomerReviewGroup,
} from '../types';

type LocationProfile = {
  dial: string;
  timezone: string;
  timezoneLabel: string;
  countryCode: string;
  vatPrefix: string;
  city: string;
};

const LOCATION_PROFILES: Record<string, LocationProfile> = {
  Estonia: {
    dial: '+372',
    timezone: 'europe/tallinn',
    timezoneLabel: 'EET, Tallinn',
    countryCode: 'EE',
    vatPrefix: 'EE',
    city: 'Tallinn',
  },
  Ukraine: {
    dial: '+380',
    timezone: 'europe/kyiv',
    timezoneLabel: 'EET, Kyiv',
    countryCode: 'UA',
    vatPrefix: 'UA',
    city: 'Kyiv',
  },
  Malaysiaa: {
    dial: '+60',
    timezone: 'asia/kuala_lumpur',
    timezoneLabel: 'MYT, Kuala Lumpur',
    countryCode: 'MY',
    vatPrefix: 'MY',
    city: 'Kuala Lumpur',
  },
  Malaysia: {
    dial: '+60',
    timezone: 'asia/kuala_lumpur',
    timezoneLabel: 'MYT, Kuala Lumpur',
    countryCode: 'MY',
    vatPrefix: 'MY',
    city: 'Kuala Lumpur',
  },
  USA: {
    dial: '+1',
    timezone: 'america/new_york',
    timezoneLabel: 'EST, New York',
    countryCode: 'US',
    vatPrefix: 'US',
    city: 'New York',
  },
  Canada: {
    dial: '+1',
    timezone: 'america/toronto',
    timezoneLabel: 'EST, Toronto',
    countryCode: 'CA',
    vatPrefix: 'CA',
    city: 'Toronto',
  },
  India: {
    dial: '+91',
    timezone: 'asia/kolkata',
    timezoneLabel: 'IST, Kolkata',
    countryCode: 'IN',
    vatPrefix: 'IN',
    city: 'Mumbai',
  },
  Netherlands: {
    dial: '+31',
    timezone: 'europe/amsterdam',
    timezoneLabel: 'CET, Amsterdam',
    countryCode: 'NL',
    vatPrefix: 'NL',
    city: 'Amsterdam',
  },
  Australia: {
    dial: '+61',
    timezone: 'australia/sydney',
    timezoneLabel: 'AEST, Sydney',
    countryCode: 'AU',
    vatPrefix: 'AU',
    city: 'Sydney',
  },
  Singapore: {
    dial: '+65',
    timezone: 'asia/singapore',
    timezoneLabel: 'SGT, Singapore',
    countryCode: 'SG',
    vatPrefix: 'SG',
    city: 'Singapore',
  },
  Spain: {
    dial: '+34',
    timezone: 'europe/madrid',
    timezoneLabel: 'CET, Madrid',
    countryCode: 'ES',
    vatPrefix: 'ES',
    city: 'Madrid',
  },
  'South Korea': {
    dial: '+82',
    timezone: 'asia/seoul',
    timezoneLabel: 'KST, Seoul',
    countryCode: 'KR',
    vatPrefix: 'KR',
    city: 'Seoul',
  },
  'United Kingdom': {
    dial: '+44',
    timezone: 'europe/london',
    timezoneLabel: 'GMT, London',
    countryCode: 'GB',
    vatPrefix: 'GB',
    city: 'London',
  },
  France: {
    dial: '+33',
    timezone: 'europe/paris',
    timezoneLabel: 'CET, Paris',
    countryCode: 'FR',
    vatPrefix: 'FR',
    city: 'Paris',
  },
  Brazil: {
    dial: '+55',
    timezone: 'america/sao_paulo',
    timezoneLabel: 'BRT, Sao Paulo',
    countryCode: 'BR',
    vatPrefix: 'BR',
    city: 'Sao Paulo',
  },
  Japan: {
    dial: '+81',
    timezone: 'asia/tokyo',
    timezoneLabel: 'JST, Tokyo',
    countryCode: 'JP',
    vatPrefix: 'JP',
    city: 'Tokyo',
  },
  Poland: {
    dial: '+48',
    timezone: 'europe/warsaw',
    timezoneLabel: 'CET, Warsaw',
    countryCode: 'PL',
    vatPrefix: 'PL',
    city: 'Warsaw',
  },
  Mexico: {
    dial: '+52',
    timezone: 'america/mexico_city',
    timezoneLabel: 'CST, Mexico City',
    countryCode: 'MX',
    vatPrefix: 'MX',
    city: 'Mexico City',
  },
  Italy: {
    dial: '+39',
    timezone: 'europe/rome',
    timezoneLabel: 'CET, Rome',
    countryCode: 'IT',
    vatPrefix: 'IT',
    city: 'Rome',
  },
  Ireland: {
    dial: '+353',
    timezone: 'europe/dublin',
    timezoneLabel: 'GMT, Dublin',
    countryCode: 'IE',
    vatPrefix: 'IE',
    city: 'Dublin',
  },
  Russia: {
    dial: '+7',
    timezone: 'europe/moscow',
    timezoneLabel: 'MSK, Moscow',
    countryCode: 'RU',
    vatPrefix: 'RU',
    city: 'Moscow',
  },
};

const FALLBACK_LOCATION: LocationProfile = {
  dial: '+1',
  timezone: 'america/new_york',
  timezoneLabel: 'EST, New York',
  countryCode: 'US',
  vatPrefix: 'US',
  city: 'New York',
};

export const defaultCustomerReviews: CustomerReviewGroup[] = [
  {
    date: '29 Aug, 25',
    orders: [
      {
        product: 'Air Max 270 React Eng...',
        tooltip: 'Air Max 270 React Engineered',
        sku: 'WM-8421',
        image: '11.png',
        rating: 4,
        text: 'These shoes exceeded my expectations. The design is modern, they feel incredibly comfortable during long walks, and the materials seem durable. Delivery was quicker than expected. Definitely worth the price, highly recommended purchase.',
      },
    ],
  },
  {
    date: '03 July, 25',
    orders: [
      {
        product: 'Trail Runner Z2',
        tooltip: '',
        sku: 'UC-3990',
        image: '1.png',
        rating: 5,
        text: "I've been using these trail runners for daily jogs, and they perform exceptionally. Excellent grip on various terrains, breathable fabric, and lightweight feel. The cushioning absorbs impact well. Arrived sooner than expected.",
      },
    ],
  },
  {
    date: '17 May, 25',
    orders: [
      {
        product: 'Urban Flex Knit Low…',
        tooltip: 'Urban Flex Knit Low Top Shoes',
        sku: 'KB-8820',
        image: '2.png',
        rating: 5,
        text: 'Super comfortable sneakers with a stylish look. They fit perfectly, and the knit material keeps my feet cool throughout the day. Great for casual wear or light workouts. Shipping was smooth and on time.',
      },
    ],
  },
  {
    date: '28 Dec, 23',
    orders: [
      {
        product: 'Blaze Street Classic',
        tooltip: '',
        sku: 'LS-1033',
        image: '15.png',
        rating: 2,
        text: 'The style is nice, but they feel stiff and took time to break in. Quality is decent, yet I expected more comfort for the price.',
      },
    ],
  },
  {
    date: '15 Mar, 25',
    orders: [
      {
        product: 'Nike Air Force 1...',
        tooltip: 'Nike Air Force 1 Low White',
        sku: 'NK-2055',
        image: '13.png',
        rating: 4,
        text: 'Classic design that never goes out of style. The white leather is clean and easy to maintain. Comfortable for all-day wear, though they run a bit narrow. Great value for a timeless sneaker.',
      },
    ],
  },
  {
    date: '02 Feb, 25',
    orders: [
      {
        product: 'Adidas Stan Smith...',
        tooltip: 'Adidas Stan Smith Original White',
        sku: 'AD-7890',
        image: '15.png',
        rating: 3,
        text: 'Simple and elegant design. The leather quality is good, but they took longer to break in than expected. Comfortable once worn in, perfect for casual occasions.',
      },
    ],
  },
];

export function locationProfile(locationName?: string | null) {
  if (!locationName) return FALLBACK_LOCATION;
  return LOCATION_PROFILES[locationName] ?? FALLBACK_LOCATION;
}

export function defaultPaymentMethods(
  customerName: string,
  email?: string | null,
): CustomerPaymentMethod[] {
  return [
    {
      logo: 'visa',
      name: customerName,
      details: 'Ending 3604 • Expires on 12/2026',
      isPrimary: true,
    },
    {
      logo: 'ideal',
      name: customerName,
      details: 'iDeal with ABN Ambro',
      isPrimary: false,
    },
    {
      logo: 'paypal',
      name: customerName,
      details: email || `${customerName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      isPrimary: false,
    },
  ];
}

function digitsFromCode(code: string) {
  const digits = code.replace(/\D/g, '');
  if (digits.length >= 8) return digits.slice(0, 8);
  return `${digits}61234567`.slice(0, 8);
}

export function companyFromName(name: string) {
  const parts = name.trim().split(/\s+/);
  const last = parts[parts.length - 1] || name;
  return `${last} Trading`;
}

export function withCustomerProfile(row: CustomerListRow): CustomerListRow {
  const location = locationProfile(row.location.name);
  const name = row.customerInfo.title;
  const email = row.customerInfo.label;
  return {
    ...row,
    phone: row.phone ?? `${location.dial} ${digitsFromCode(row.user)}`,
    company: row.company ?? companyFromName(name),
    timezone: row.timezone ?? location.timezone,
    billingAddress: row.billingAddress ?? `${location.city}, ${row.location.name}`,
    vatId: row.vatId ?? `${location.vatPrefix}${digitsFromCode(row.user)}B01`,
    joined: row.joined ?? row.updated,
    lastVisit: row.lastVisit ?? row.updated,
    lastVisitAt: row.lastVisitAt ?? null,
    accountBalance: row.accountBalance ?? 0,
    paymentMethods: row.paymentMethods ?? defaultPaymentMethods(name, email),
    reviews: row.reviews ?? defaultCustomerReviews,
  };
}

export function parseMockDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return null;
}

export function timezoneLabel(timezone?: string | null, locationName?: string | null) {
  if (!timezone) return locationProfile(locationName).timezoneLabel;
  const match = Object.values(LOCATION_PROFILES).find((item) => item.timezone === timezone);
  return match?.timezoneLabel ?? timezone;
}

export type BadgeTone = string;

export interface ProductInfo {
  image: string;
  title: string;
  label: string;
  tooltip?: string;
}

export interface ProductListRow {
  id: string;
  productInfo: {
    image: string;
    title: string;
    label: string;
    tooltip: string;
  };
  category: string;
  price: string;
  status: {
    label: string;
    variant: BadgeTone;
  };
  created: string;
  updated: string;
  barcode?: string;
  description?: string;
  featured?: boolean;
  tags?: string[];
  categoryId?: string | null;
  brandId?: string | null;
  image?: string;
}

export interface CategoryListRow {
  id: string;
  productInfo: {
    image: string;
    title: string;
    label: string;
  };
  productsQty: string;
  totalEarnings: string;
  status: {
    label: string;
    variant: BadgeTone;
  };
  featured: boolean;
  description?: string | null;
  created?: string;
  updated?: string;
}

export interface AllStockRow {
  id: string;
  productInfo: {
    image: string;
    title: string;
    label: string;
    tooltip: string;
  };
  stockFlow: {
    number1: number;
    number2: number;
    number3: number;
  };
  delta: {
    label: string;
    variant: BadgeTone;
  };
  price: string;
  category: string;
  supplier: {
    logo: string;
    name: string;
  };
  updated: string;
}

export interface CurrentStockRow {
  id: string;
  productInfo: {
    image: string;
    title: string;
    label: string;
    tooltip: string;
  };
  stock: number;
  rsvd: number;
  tlvl: number;
  delta: {
    label: string;
    variant: BadgeTone;
  };
  sum: string;
  lastMoved: string;
  handler: string;
  trend: {
    label: string;
    variant: BadgeTone;
  };
}

export interface InboundStockRow {
  id: string;
  productInfo: {
    title: string;
    label: string;
    tooltip: string;
  };
  dateOrder: string;
  qty: number;
  stock: string;
  status: {
    label: string;
    variant: BadgeTone;
  };
  arrivalDate: string;
  carrier: string;
  warehouse?: string;
  warehouseId?: string | null;
  supplier: {
    logo: string;
    name: string;
  };
}

export interface OutboundStockRow {
  notify?: boolean;
  id: string;
  dateOrder: string;
  productInfo: {
    title: string;
    label: string;
    tooltip: string;
  };
  qty: string;
  status: {
    label: string;
    variant: BadgeTone;
  };
  expDelivery: string;
  warehouse: string;
  carrier: string;
}

export interface StockPlannerRow {
  id: string;
  productInfo: {
    image: string;
    title: string;
    label: string;
    tooltip: string;
  };
  stock: number;
  rsvd: number;
  tlvl: number;
  delta: {
    label: string;
    variant: BadgeTone;
  };
  flow: number;
  reorderIn: {
    days: number;
    date: string;
  };
  reorder: number;
  leadTime: {
    days: number;
    date: string;
  };
  ar: boolean;
}

export interface CustomerPaymentMethod {
  logo: string;
  name: string;
  details: string;
  isPrimary: boolean;
}

export interface CustomerReviewItem {
  product: string;
  tooltip: string;
  sku: string;
  image: string;
  rating: number;
  text: string;
}

export interface CustomerReviewGroup {
  date: string;
  orders: CustomerReviewItem[];
}

export interface CustomerListRow {
  user: string;
  id: string;
  customerInfo: {
    image: string;
    title: string;
    label: string;
    statusColor: string;
    verified?: boolean;
  };
  location: {
    name: string;
    flag: string;
  };
  total: string;
  price: string;
  status: {
    label: string;
    variant: BadgeTone;
  };
  created: string;
  updated: string;
  phone?: string;
  company?: string;
  timezone?: string;
  billingAddress?: string;
  vatId?: string;
  joined?: string;
  lastVisit?: string;
  lastVisitAt?: string | null;
  accountBalance?: number;
  paymentMethods?: CustomerPaymentMethod[];
  reviews?: CustomerReviewGroup[];
}

export type CustomerAccountTransactionType = 'deposit' | 'sale' | 'void';

export interface CustomerAccountTransaction {
  id: string;
  customerId: string;
  type: CustomerAccountTransactionType;
  amount: number;
  balanceAfter: number;
  paymentMethod: string | null;
  notes: string | null;
  posSaleId: string | null;
  posSaleNumber: string | null;
  createdAt: string;
}

export interface OrderItemRow {
  id: string;
  productInfo: {
    image: string;
    title: string;
    label: string;
    tooltip: string;
  };
  category: string;
  price: string;
  trends: {
    label: string;
    variant: BadgeTone;
  };
  stock: number;
  reserved: number;
  thresholdLevel: number;
  supplier: {
    name: string;
    logo: string;
  };
  quantity?: number;
  color?: string;
  weight?: string;
}

export interface OrderTrackingEventRow {
  id: string;
  title: string;
  date: string;
  description: string;
  location?: string;
  sortOrder: number;
}

export interface OrderDetailItem {
  image: string;
  title: string;
  sku: string;
  color: string;
  weight: string;
}

export interface OrderListRow {
  deliveryStatus: {
    label: string;
    variant: BadgeTone;
  };
  customer: string;
  customerId?: string | null;
  date: string;
  order: string;
  id: string;
  total: string;
  paymentStatus: {
    label: string;
    variant: BadgeTone;
  };
  items: number;
  carrier: {
    name: string;
    logo: string;
  };
  category: string;
  subtotal?: string;
  shippingCost?: string;
  tax?: string;
  shipmentNumber?: string;
  trackingNumber?: string;
  shippingPriority?: string;
  deliveryMethod?: string;
  currentStep?: number;
  originAddress?: string;
  destinationAddress?: string;
  shippingLabel?: string;
  shippingLine1?: string;
  shippingLine2?: string;
  totalTime?: string;
  departureTime?: string;
  expectedArrival?: string;
}

export interface OrderDetailRow extends OrderListRow {
  subtotal: string;
  shippingCost: string;
  tax: string;
  shipmentNumber: string;
  trackingNumber: string;
  shippingPriority: string;
  deliveryMethod: string;
  currentStep: number;
  originAddress: string;
  destinationAddress: string;
  shippingLabel: string;
  shippingLine1: string;
  shippingLine2: string;
  totalTime: string;
  departureTime: string;
  expectedArrival: string;
  detailItems: OrderDetailItem[];
  trackingEvents: OrderTrackingEventRow[];
}

export interface DetailsOrdersRow {
  date: string;
  order: string;
  id: string;
  total: string;
  paymentStatus: {
    label: string;
    variant: BadgeTone;
  };
  items: number;
  carrier: {
    name: string;
    logo: string;
  };
  category: string;
}

export interface DetailsInvoiceRow {
  invoice: string;
  date: string;
  dueDate: string;
  id: string;
  total: string;
  paymentStatus: {
    label: string;
    variant: BadgeTone;
  };
}

export interface ProductInfoRow {
  id: string;
  productInfo: {
    image: string;
    title: string;
    label: string;
    tooltip: string;
  };
  category: string;
  price: string;
  trends: {
    label: string;
    variant: BadgeTone;
  };
  stock: number;
  rsvd: number;
  tlvl: number;
  supplier: {
    logo: string;
    name: string;
  };
}

export interface ProductVariantRow {
  id: string;
  size: string;
  color: string;
  onHand: string;
  price: string;
  available: string;
}

export interface ProductOptionValue {
  id: string;
  value: string;
}

export interface ProductOptionCard {
  id: string;
  name: string;
  isOpen: boolean;
  values: ProductOptionValue[];
}

export interface ContactChannel {
  provider: string;
  handle: string;
}

export interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  rate: number;
  estimatedDays: string;
}

export interface StoreLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  isDefault: boolean;
}

export interface StoreSettings {
  id: string;
  storeName: string;
  storeCode: string;
  status: string;
  establishedAt: string;
  logo: string | null;
  storeUrl: string | null;
  phone: string | null;
  contactEmail: string | null;
  tags: string[];
  automaticTimeZone: boolean;
  timeZone: string;
  language: string;
  dateFormat: string;
  aiSemanticSearch: boolean;
  aiInsight: boolean;
  contactChannels: ContactChannel[];
  currency: string;
  cardMethods: string[];
  applePay: boolean;
  googlePay: boolean;
  paypal: boolean;
  taxRateScope: string;
  taxCalculation: string;
  taxPercent: number;
  automaticInvoice: boolean;
  noReplyEmail: string | null;
  guestCheckout: boolean;
  collectPhone: boolean;
  orderNotes: boolean;
  termsRequired: boolean;
  abandonedCartEmail: boolean;
  defaultCheckoutCountry: string;
  freeShippingEnabled: boolean;
  freeShippingMin: number;
  localPickup: boolean;
  expressShipping: boolean;
  shippingOrigin: string | null;
  defaultCarrier: string | null;
  handlingDays: number;
  shippingZones: ShippingZone[];
  locations: StoreLocation[];
  twoFactorRequired: boolean;
  sessionTimeoutMinutes: number;
  loginAlerts: boolean;
  passwordMinLength: number;
  requireStrongPassword: boolean;
  emailOrderConfirm: boolean;
  emailShippingUpdates: boolean;
  emailLowStock: boolean;
  emailNewCustomer: boolean;
  smsOrderUpdates: boolean;
  notifyEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseListRow {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  status: {
    label: string;
    variant: BadgeTone;
  };
  isDefault: boolean;
  skuCount: number;
  onHand: number;
  created?: string;
  updated?: string;
}

export type PosPaymentMethod =
  | 'cash'
  | 'credit'
  | 'mtn_mobile_money'
  | 'orange_money'
  | 'bank_transfer';
export type PosSaleStatus = 'completed' | 'voided';

export interface PosSaleItemRow {
  id: string;
  saleId: string;
  productId?: string | null;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  sku: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineDiscount: number;
  lineTotal: number;
  color?: string | null;
  size?: string | null;
}

export interface PosSaleRow {
  id: string;
  saleNumber: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  customerId?: string | null;
  customerName: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paymentMethod: PosPaymentMethod;
  amountTendered: number;
  changeDue: number;
  notes?: string | null;
  status: PosSaleStatus;
  itemCount: number;
  createdAt: string;
  items?: PosSaleItemRow[];
}

export interface WarehouseStockRow {
  id: string;
  warehouseId: string;
  productId: string;
  qty: number;
  reserved: number;
}

export interface PosCatalogProduct {
  id: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  name: string;
  sku: string;
  barcode: string;
  image: string;
  price: number;
  status: string;
  qty: number;
}

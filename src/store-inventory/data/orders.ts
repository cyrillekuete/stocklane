import { parseMoney } from '../lib/format';
import type {
  DetailsInvoiceRow,
  DetailsOrdersRow,
  OrderDetailItem,
  OrderDetailRow,
  OrderItemRow,
  OrderListRow,
  OrderTrackingEventRow,
  ProductInfoRow,
} from '../types';

export const orderItemsMockData: OrderItemRow[] = [
  {
    id: '1',
    productInfo: {
      image: '11.png',
      title: 'Air Max 270 React Eng...',
      label: 'WM-8421',
      tooltip: 'Air Max 270 React Engineered - Premium sneakers with advanced cushioning technology',
    },
    category: 'Sneakers',
    price: '$83.00',
    trends: {
      label: 'Fast Moving',
      variant: 'success',
    },
    stock: 92,
    reserved: 5,
    thresholdLevel: 110,
    supplier: {
      name: 'SwiftStock',
      logo: 'clusterhq.svg',
    },
  },
  {
    id: '2',
    productInfo: {
      image: '10.png',
      title: 'Trail Runner Z2',
      label: 'UC-3990',
      tooltip: 'Trail Runner Z2 - High-performance outdoor running shoes with superior grip',
    },
    category: 'Outdoor',
    price: '$110.00',
    trends: {
      label: 'Promo',
      variant: 'info',
    },
    stock: 12,
    reserved: 3,
    thresholdLevel: 250,
    supplier: {
      name: 'NexaSource',
      logo: 'coinhodler.svg',
    },
  },
  {
    id: '3',
    productInfo: {
      image: '9.png',
      title: 'Urban Flex Knit Low...',
      label: 'KB-8820',
      tooltip: 'Urban Flex Knit Low - Comfortable urban running shoes with flexible knit upper',
    },
    category: 'Runners',
    price: '$76.50',
    trends: {
      label: 'Clearance',
      variant: 'warning',
    },
    stock: 47,
    reserved: 9,
    thresholdLevel: 40,
    supplier: {
      name: 'CoreMart',
      logo: 'infography.svg',
    },
  },
  {
    id: '4',
    productInfo: {
      image: '8.png',
      title: 'Blaze Street Classic',
      label: 'LS-1033',
      tooltip: 'Blaze Street Classic - Timeless street style sneakers with modern comfort',
    },
    category: 'Sneakers',
    price: '$69.99',
    trends: {
      label: 'Slow Moving',
      variant: 'destructive',
    },
    stock: 0,
    reserved: 0,
    thresholdLevel: 100,
    supplier: {
      name: 'StockLab',
      logo: 'clusterhq.svg',
    },
  },
];

export const orderListMockData: OrderListRow[] = [
  {
    id: '1',
    order: 'SO-TX-4587',
    date: '18 Aug, 2025',
    customer: 'John Smith',
    total: '$372.93',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
    items: 2,
    deliveryStatus: {
      label: 'Shipped',
      variant: 'primary',
    },
    carrier: {
      name: 'UPS Global',
      logo: 'ups.svg',
    },
    category: 'Electronics',
  },
  {
    id: '2',
    order: 'SO-TX-4590',
    date: '17 Aug, 2025',
    customer: 'Sarah Lee',
    total: '$245.10',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
    items: 1,
    deliveryStatus: {
      label: 'Processing',
      variant: 'info',
    },
    carrier: {
      name: 'FedEx Standard',
      logo: 'fedEx.svg',
    },
    category: 'Clothing',
  },
  {
    id: '3',
    order: 'SO-CA-1254',
    date: '16 Aug, 2025',
    customer: 'Sarah Lee',
    total: '$1,024.50',
    paymentStatus: {
      label: 'Pending',
      variant: 'info',
    },
    items: 3,
    deliveryStatus: {
      label: 'Delivered',
      variant: 'success',
    },
    carrier: {
      name: 'PostNL',
      logo: 'postNl.svg',
    },
    category: 'Home & Garden',
  },
  {
    id: '4',
    order: 'SO-NY-8874',
    date: '12 Aug, 2025',
    customer: 'Emily Carter',
    total: '$540.00',
    paymentStatus: {
      label: 'Failed',
      variant: 'destructive',
    },
    items: 2,
    deliveryStatus: {
      label: 'Shipped',
      variant: 'primary',
    },
    carrier: {
      name: 'UPS Global',
      logo: 'ups.svg',
    },
    category: 'Electronics',
  },
  {
    id: '5',
    order: 'SO-FL-5633',
    date: '5 Aug, 2025',
    customer: 'Liam Johnson',
    total: '$120.99',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
    items: 3,
    deliveryStatus: {
      label: 'On Hold',
      variant: 'secondary',
    },
    carrier: {
      name: 'DHL Express',
      logo: 'dhl.svg',
    },
    category: 'Electronics',
  },
  {
    id: '6',
    order: 'SO-TX-4593',
    date: '29 Jul, 2025',
    customer: 'Olivia Brown',
    total: '$799.00',
    paymentStatus: {
      label: 'Cancelled',
      variant: 'warning',
    },
    items: 3,
    deliveryStatus: {
      label: 'Shipped',
      variant: 'primary',
    },
    carrier: {
      name: 'UPS Global',
      logo: 'ups.svg',
    },
    category: 'Electronics',
  },
  {
    id: '7',
    order: 'SO-CA-1255',
    date: '23 Jul, 2025',
    customer: 'Noah Wilson',
    total: '$215.75',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
    items: 1,
    deliveryStatus: {
      label: 'Canceled',
      variant: 'warning',
    },
    carrier: {
      name: 'PostNL',
      logo: 'postNl.svg',
    },
    category: 'Electronics',
  },
  {
    id: '8',
    order: 'SO-NV-7755',
    date: '20 Jul, 2025',
    customer: 'Ava Martinez',
    total: '$430.20',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
    items: 4,
    deliveryStatus: {
      label: 'Shipped',
      variant: 'primary',
    },
    carrier: {
      name: 'In-Store Pickup',
      logo: 'postNl.svg',
    },
    category: 'Electronics',
  },
  {
    id: '9',
    order: 'SO-WA-3321',
    date: '17 Jul, 2025',
    customer: 'Ethan Davis',
    total: '$620.00',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
    items: 2,
    deliveryStatus: {
      label: 'Processing',
      variant: 'info',
    },
    carrier: {
      name: 'UPS Global',
      logo: 'ups.svg',
    },
    category: 'Electronics',
  },
  {
    id: '10',
    order: 'SO-IL-9912',
    date: '11 Jul, 2025',
    customer: 'Mia Anderson',
    total: '$980.49',
    paymentStatus: {
      label: 'Pending',
      variant: 'info',
    },
    items: 8,
    deliveryStatus: {
      label: 'On Hold',
      variant: 'secondary',
    },
    carrier: {
      name: 'PostNL',
      logo: 'postNl.svg',
    },
    category: 'Electronics',
  },
  {
    id: '11',
    order: 'SO-CA-1256',
    date: '8 Jul, 2025',
    customer: 'Lucas Garcia',
    total: '$345.67',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
    items: 2,
    deliveryStatus: {
      label: 'Delivered',
      variant: 'success',
    },
    carrier: {
      name: 'FedEx Standard',
      logo: 'fedEx.svg',
    },
    category: 'Clothing',
  },
  {
    id: '12',
    order: 'SO-TX-4594',
    date: '5 Jul, 2025',
    customer: 'Emma Wilson',
    total: '$1,250.00',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
    items: 5,
    deliveryStatus: {
      label: 'Shipped',
      variant: 'primary',
    },
    carrier: {
      name: 'DHL Express',
      logo: 'dhl.svg',
    },
    category: 'Home & Garden',
  },
  {
    id: '13',
    order: 'SO-NY-8875',
    date: '2 Jul, 2025',
    customer: 'James Taylor',
    total: '$89.99',
    paymentStatus: {
      label: 'Failed',
      variant: 'destructive',
    },
    items: 1,
    deliveryStatus: {
      label: 'Processing',
      variant: 'info',
    },
    carrier: {
      name: 'UPS Global',
      logo: 'ups.svg',
    },
    category: 'Electronics',
  },
  {
    id: '14',
    order: 'SO-FL-5634',
    date: '29 Jun, 2025',
    customer: 'Sophia Rodriguez',
    total: '$567.89',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
    items: 3,
    deliveryStatus: {
      label: 'On Hold',
      variant: 'secondary',
    },
    carrier: {
      name: 'PostNL',
      logo: 'postNl.svg',
    },
    category: 'Electronics',
  },
  {
    id: '15',
    order: 'SO-TX-4595',
    date: '26 Jun, 2025',
    customer: 'Benjamin Lee',
    total: '$2,100.50',
    paymentStatus: {
      label: 'Cancelled',
      variant: 'warning',
    },
    items: 7,
    deliveryStatus: {
      label: 'Canceled',
      variant: 'warning',
    },
    carrier: {
      name: 'FedEx Standard',
      logo: 'fedEx.svg',
    },
    category: 'Electronics',
  },
  {
    id: '16',
    order: 'SO-CA-1257',
    date: '23 Jun, 2025',
    customer: 'Isabella Martinez',
    total: '$445.75',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
    items: 2,
    deliveryStatus: {
      label: 'Delivered',
      variant: 'success',
    },
    carrier: {
      name: 'DHL Express',
      logo: 'dhl.svg',
    },
    category: 'Clothing',
  },
  {
    id: '17',
    order: 'SO-NV-7756',
    date: '20 Jun, 2025',
    customer: 'Mason Thompson',
    total: '$789.25',
    paymentStatus: {
      label: 'Pending',
      variant: 'info',
    },
    items: 4,
    deliveryStatus: {
      label: 'Processing',
      variant: 'info',
    },
    carrier: {
      name: 'UPS Global',
      logo: 'ups.svg',
    },
    category: 'Home & Garden',
  },
  {
    id: '18',
    order: 'SO-WA-3322',
    date: '17 Jun, 2025',
    customer: 'Aria Johnson',
    total: '$156.00',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
    items: 1,
    deliveryStatus: {
      label: 'Shipped',
      variant: 'primary',
    },
    carrier: {
      name: 'PostNL',
      logo: 'postNl.svg',
    },
    category: 'Electronics',
  },
  {
    id: '19',
    order: 'SO-IL-9913',
    date: '14 Jun, 2025',
    customer: 'Ethan Davis',
    total: '$890.30',
    paymentStatus: {
      label: 'Failed',
      variant: 'destructive',
    },
    items: 3,
    deliveryStatus: {
      label: 'On Hold',
      variant: 'secondary',
    },
    carrier: {
      name: 'FedEx Standard',
      logo: 'fedEx.svg',
    },
    category: 'Electronics',
  },
  {
    id: '20',
    order: 'SO-CA-1258',
    date: '11 Jun, 2025',
    customer: 'Olivia Brown',
    total: '$1,450.00',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
    items: 6,
    deliveryStatus: {
      label: 'Delivered',
      variant: 'success',
    },
    carrier: {
      name: 'DHL Express',
      logo: 'dhl.svg',
    },
    category: 'Home & Garden',
  },
  {
    id: '21',
    order: 'SO-TX-4596',
    date: '8 Jun, 2025',
    customer: 'Noah Wilson',
    total: '$234.56',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
    items: 2,
    deliveryStatus: {
      label: 'Shipped',
      variant: 'primary',
    },
    carrier: {
      name: 'UPS Global',
      logo: 'ups.svg',
    },
    category: 'Clothing',
  },
  {
    id: '22',
    order: 'SO-NY-8876',
    date: '5 Jun, 2025',
    customer: 'Ava Garcia',
    total: '$678.90',
    paymentStatus: {
      label: 'Cancelled',
      variant: 'warning',
    },
    items: 4,
    deliveryStatus: {
      label: 'Canceled',
      variant: 'warning',
    },
    carrier: {
      name: 'PostNL',
      logo: 'postNl.svg',
    },
    category: 'Electronics',
  },
  {
    id: '23',
    order: 'SO-FL-5635',
    date: '2 Jun, 2025',
    customer: 'William Rodriguez',
    total: '$345.67',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
    items: 1,
    deliveryStatus: {
      label: 'Processing',
      variant: 'info',
    },
    carrier: {
      name: 'FedEx Standard',
      logo: 'fedEx.svg',
    },
    category: 'Clothing',
  },
  {
    id: '24',
    order: 'SO-TX-4597',
    date: '30 May, 2025',
    customer: 'Sofia Martinez',
    total: '$1,890.25',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
    items: 8,
    deliveryStatus: {
      label: 'Delivered',
      variant: 'success',
    },
    carrier: {
      name: 'DHL Express',
      logo: 'dhl.svg',
    },
    category: 'Home & Garden',
  },
  {
    id: '25',
    order: 'SO-CA-1259',
    date: '27 May, 2025',
    customer: 'Henry Thompson',
    total: '$567.89',
    paymentStatus: {
      label: 'Pending',
      variant: 'info',
    },
    items: 3,
    deliveryStatus: {
      label: 'On Hold',
      variant: 'secondary',
    },
    carrier: {
      name: 'UPS Global',
      logo: 'ups.svg',
    },
    category: 'Electronics',
  },
];

export const detailsOrdersMockData: DetailsOrdersRow[] = [
  {
    id: '1',
    order: 'SO-TX-4587',
    date: '18 Aug, 2025',
    total: '$372.93',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
    items: 2,
    carrier: {
      name: 'UPS Global',
      logo: 'ups.svg',
    },
    category: 'Electronics',
  },
  {
    id: '2',
    order: 'SO-TX-4590',
    date: '17 Aug, 2025',
    total: '$245.10',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
    items: 1,
    carrier: {
      name: 'FedEx Standard',
      logo: 'fedEx.svg',
    },
    category: 'Clothing',
  },
  {
    id: '3',
    order: 'SO-CA-1254',
    date: '16 Aug, 2025',
    total: '$1,024.50',
    paymentStatus: {
      label: 'Pending',
      variant: 'info',
    },
    items: 3,
    carrier: {
      name: 'PostNL',
      logo: 'postNl.svg',
    },
    category: 'Home & Garden',
  },
  {
    id: '4',
    order: 'SO-NY-8874',
    date: '12 Aug, 2025',
    total: '$540.00',
    paymentStatus: {
      label: 'Failed',
      variant: 'destructive',
    },
    items: 2,
    carrier: {
      name: 'UPS Global',
      logo: 'ups.svg',
    },
    category: 'Electronics',
  },
  {
    id: '5',
    order: 'SO-FL-5633',
    date: '5 Aug, 2025',
    total: '$120.99',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
    items: 3,
    carrier: {
      name: 'DHL Express',
      logo: 'dhl.svg',
    },
    category: 'Electronics',
  },
  {
    id: '6',
    order: 'SO-WA-3321',
    date: '17 Jul, 2025',
    total: '$620.00',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
    items: 2,
    carrier: {
      name: 'UPS Global',
      logo: 'ups.svg',
    },
    category: 'Electronics',
  },
  {
    id: '7',
    order: 'SO-CA-1255',
    date: '23 Jul, 2025',
    total: '$215.75',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
    items: 1,
    carrier: {
      name: 'PostNL',
      logo: 'postNl.svg',
    },
    category: 'Electronics',
  },
  {
    id: '8',
    order: 'SO-NV-7755',
    date: '20 Jul, 2025',
    total: '$430.20',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
    items: 4,
    carrier: {
      name: 'In-Store Pickup',
      logo: 'postNl.svg',
    },
    category: 'Electronics',
  },
  {
    id: '9',
    order: 'SO-WA-3321',
    date: '17 Jul, 2025',
    total: '$620.00',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
    items: 2,
    carrier: {
      name: 'UPS Global',
      logo: 'ups.svg',
    },
    category: 'Electronics',
  },
  {
    id: '10',
    order: 'SO-IL-9912',
    date: '11 Jul, 2025',
    total: '$980.49',
    paymentStatus: {
      label: 'Pending',
      variant: 'info',
    },
    items: 8,
    carrier: {
      name: 'PostNL',
      logo: 'postNl.svg',
    },
    category: 'Electronics',
  },
  {
    id: '11',
    order: 'SO-CA-1256',
    date: '8 Jul, 2025',
    total: '$345.67',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
    items: 2,
    carrier: {
      name: 'FedEx Standard',
      logo: 'fedEx.svg',
    },
    category: 'Clothing',
  },
  {
    id: '12',
    order: 'SO-TX-4594',
    date: '5 Jul, 2025',
    total: '$1,250.00',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
    items: 5,
    carrier: {
      name: 'DHL Express',
      logo: 'dhl.svg',
    },
    category: 'Home & Garden',
  },
  {
    id: '13',
    order: 'SO-NY-8875',
    date: '2 Jul, 2025',
    total: '$89.99',
    paymentStatus: {
      label: 'Failed',
      variant: 'destructive',
    },
    items: 1,
    carrier: {
      name: 'UPS Global',
      logo: 'ups.svg',
    },
    category: 'Electronics',
  },
  {
    id: '14',
    order: 'SO-FL-5634',
    date: '29 Jun, 2025',
    total: '$567.89',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
    items: 3,
    carrier: {
      name: 'PostNL',
      logo: 'postNl.svg',
    },
    category: 'Electronics',
  },
  {
    id: '15',
    order: 'SO-TX-4595',
    date: '26 Jun, 2025',
    total: '$2,100.50',
    paymentStatus: {
      label: 'Cancelled',
      variant: 'warning',
    },
    items: 7,
    carrier: {
      name: 'FedEx Standard',
      logo: 'fedEx.svg',
    },
    category: 'Electronics',
  },
  {
    id: '16',
    order: 'SO-CA-1257',
    date: '23 Jun, 2025',
    total: '$445.75',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
    items: 2,
    carrier: {
      name: 'DHL Express',
      logo: 'dhl.svg',
    },
    category: 'Clothing',
  },
  {
    id: '17',
    order: 'SO-NV-7756',
    date: '20 Jun, 2025',
    total: '$789.25',
    paymentStatus: {
      label: 'Pending',
      variant: 'info',
    },
    items: 4,
    carrier: {
      name: 'UPS Global',
      logo: 'ups.svg',
    },
    category: 'Home & Garden',
  },
  {
    id: '18',
    order: 'SO-WA-3322',
    date: '17 Jun, 2025',
    total: '$156.00',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
    items: 1,
    carrier: {
      name: 'PostNL',
      logo: 'postNl.svg',
    },
    category: 'Electronics',
  },
  {
    id: '19',
    order: 'SO-IL-9913',
    date: '14 Jun, 2025',
    total: '$890.30',
    paymentStatus: {
      label: 'Failed',
      variant: 'destructive',
    },
    items: 3,
    carrier: {
      name: 'FedEx Standard',
      logo: 'fedEx.svg',
    },
    category: 'Electronics',
  },
  {
    id: '20',
    order: 'SO-CA-1258',
    date: '11 Jun, 2025',
    total: '$1,450.00',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
    items: 6,
    carrier: {
      name: 'DHL Express',
      logo: 'dhl.svg',
    },
    category: 'Home & Garden',
  },
  {
    id: '21',
    order: 'SO-TX-4596',
    date: '8 Jun, 2025',
    total: '$234.56',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
    items: 2,
    carrier: {
      name: 'UPS Global',
      logo: 'ups.svg',
    },
    category: 'Clothing',
  },
  {
    id: '22',
    order: 'SO-NY-8876',
    date: '5 Jun, 2025',
    total: '$678.90',
    paymentStatus: {
      label: 'Cancelled',
      variant: 'warning',
    },
    items: 4,
    carrier: {
      name: 'PostNL',
      logo: 'postNl.svg',
    },
    category: 'Electronics',
  },
  {
    id: '23',
    order: 'SO-FL-5635',
    date: '2 Jun, 2025',
    total: '$345.67',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
    items: 1,
    carrier: {
      name: 'FedEx Standard',
      logo: 'fedEx.svg',
    },
    category: 'Clothing',
  },
  {
    id: '24',
    order: 'SO-TX-4597',
    date: '30 May, 2025',
    total: '$1,890.25',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
    items: 8,
    carrier: {
      name: 'DHL Express',
      logo: 'dhl.svg',
    },
    category: 'Home & Garden',
  },
  {
    id: '25',
    order: 'SO-CA-1259',
    date: '27 May, 2025',
    total: '$567.89',
    paymentStatus: {
      label: 'Pending',
      variant: 'info',
    },
    items: 3,
    carrier: {
      name: 'UPS Global',
      logo: 'ups.svg',
    },
    category: 'Electronics',
  },
];



export const detailsInvoiceMockData: DetailsInvoiceRow[] = [
  {
    id: '1',
    invoice: 'INV-7845',
    date: '18 Aug, 2025',
    dueDate: '25 Aug, 2025',
    total: '$372.93',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
  },
  {
    id: '2',
    invoice: 'INV-7844',
    date: '17 Aug, 2025',
    dueDate: '24 Aug, 2025',
    total: '$245.10',
    paymentStatus: {
      label: 'Paid',
      variant: 'success',
    },
  },
  {
    id: '3',
    invoice: 'IINV-7843',
    date: '16 Aug, 2025',
    dueDate: '23 Aug, 2025',
    total: '$1,024.50',
    paymentStatus: {
      label: 'Pending',
      variant: 'info',
    },
  },
  {
    id: '4',
    invoice: 'INV-7842',
    date: '12 Aug, 2025',
    dueDate: '19 Aug, 2025',
    total: '$540.00',
    paymentStatus: {
      label: 'Overdue',
      variant: 'destructive',
    },
  },
    {
      id: '5',
      invoice: 'INV-7841',
      date: '5 Aug, 2025',
      dueDate: '12 Aug, 2025',
      total: '$120.99',
      paymentStatus: {
        label: 'Paid',
        variant: 'success',
      },
    },
    {
      id: '6',
      invoice: 'INV-7840',
      date: '4 Aug, 2025',
      dueDate: '11 Aug, 2025',
      total: '$890.50',
      paymentStatus: {
        label: 'Pending',
        variant: 'info',
      },
    },
    {
      id: '7',
      invoice: 'INV-7839',
      date: '3 Aug, 2025',
      dueDate: '10 Aug, 2025',
      total: '$445.75',
      paymentStatus: {
        label: 'Overdue',
        variant: 'destructive',
      },
    },
    {
      id: '8',
      invoice: 'INV-7838',
      date: '2 Aug, 2025',
      dueDate: '9 Aug, 2025',
      total: '$1,250.00',
      paymentStatus: {
        label: 'Paid',
        variant: 'success',
      },
    },
    {
      id: '9',
      invoice: 'INV-7837',
      date: '1 Aug, 2025',
      dueDate: '8 Aug, 2025',
      total: '$567.89',
      paymentStatus: {
        label: 'Pending',
        variant: 'info',
      },
    },
    {
      id: '10',
      invoice: 'INV-7836',
      date: '31 Jul, 2025',
      dueDate: '7 Aug, 2025',
      total: '$234.56',
      paymentStatus: {
        label: 'Paid',
        variant: 'success',
      },
    },
    {
      id: '11',
      invoice: 'INV-7835',
      date: '30 Jul, 2025',
      dueDate: '6 Aug, 2025',
      total: '$789.25',
      paymentStatus: {
        label: 'Overdue',
        variant: 'destructive',
      },
    },
    {
      id: '12',
      invoice: 'INV-7834',
      date: '29 Jul, 2025',
      dueDate: '5 Aug, 2025',
      total: '$345.67',
      paymentStatus: {
        label: 'Paid',
        variant: 'success',
      },
    },
    {
      id: '13',
      invoice: 'INV-7833',
      date: '28 Jul, 2025',
      dueDate: '4 Aug, 2025',
      total: '$1,890.25',
      paymentStatus: {
        label: 'Pending',
        variant: 'info',
      },
    },
    {
      id: '14',
      invoice: 'INV-7832',
      date: '27 Jul, 2025',
      dueDate: '3 Aug, 2025',
      total: '$678.90',
      paymentStatus: {
        label: 'Paid',
        variant: 'success',
      },
    },
    {
      id: '15',
      invoice: 'INV-7831',
      date: '26 Jul, 2025',
      dueDate: '2 Aug, 2025',
      total: '$456.78',
      paymentStatus: {
        label: 'Overdue',
        variant: 'destructive',
      },
    },
    {
      id: '16',
      invoice: 'INV-7830',
      date: '25 Jul, 2025',
      dueDate: '1 Aug, 2025',
      total: '$2,100.50',
      paymentStatus: {
        label: 'Paid',
        variant: 'success',
      },
    },
    {
      id: '17',
      invoice: 'INV-7829',
      date: '24 Jul, 2025',
      dueDate: '31 Jul, 2025',
      total: '$123.45',
      paymentStatus: {
        label: 'Pending',
        variant: 'info',
      },
    },
    {
      id: '18',
      invoice: 'INV-7828',
      date: '23 Jul, 2025',
      dueDate: '30 Jul, 2025',
      total: '$987.65',
      paymentStatus: {
        label: 'Paid',
        variant: 'success',
      },
    },
    {
      id: '19',
      invoice: 'INV-7827',
      date: '22 Jul, 2025',
      dueDate: '29 Jul, 2025',
      total: '$543.21',
      paymentStatus: {
        label: 'Overdue',
        variant: 'destructive',
      },
    },
    {
      id: '20',
      invoice: 'INV-7826',
      date: '21 Jul, 2025',
      dueDate: '28 Jul, 2025',
      total: '$876.54',
      paymentStatus: {
        label: 'Paid',
        variant: 'success',
      },
    },
    {
      id: '21',
      invoice: 'INV-7825',
      date: '20 Jul, 2025',
      dueDate: '27 Jul, 2025',
      total: '$321.09',
      paymentStatus: {
        label: 'Pending',
        variant: 'info',
      },
    },
    {
      id: '22',
      invoice: 'INV-7824',
      date: '19 Jul, 2025',
      dueDate: '26 Jul, 2025',
      total: '$654.32',
      paymentStatus: {
        label: 'Paid',
        variant: 'success',
      },
    },
    {
      id: '23',
      invoice: 'INV-7823',
      date: '18 Jul, 2025',
      dueDate: '25 Jul, 2025',
      total: '$1,234.56',
      paymentStatus: {
        label: 'Overdue',
        variant: 'destructive',
      },
    },
    {
      id: '24',
      invoice: 'INV-7822',
      date: '17 Jul, 2025',
      dueDate: '24 Jul, 2025',
      total: '$789.01',
      paymentStatus: {
        label: 'Paid',
        variant: 'success',
      },
    },
    {
      id: '25',
      invoice: 'INV-7821',
      date: '16 Jul, 2025',
      dueDate: '23 Jul, 2025',
      total: '$456.78',
      paymentStatus: {
        label: 'Pending',
        variant: 'info',
      },
    }
];



export const productInfoMockData: ProductInfoRow[] = [
  {
    id: '1',
    productInfo: {
      image: '11.png',
      title: 'Air Max 270 React Eng…',
      label: 'WM-8421',
      tooltip: 'Air Max 270 React Engineered',
    },
    category: 'Sneakers',
    price: '$83.00',
    trends: {
      label: 'Fast Moving',
      variant: 'success',
    },
    stock: 92,
    rsvd: 5,
    tlvl: 10,
    supplier: {
      name: 'SwiftStock',
      logo: 'clusterhq.svg',
    }
  },
  {
    id: '2',
    productInfo: {
      image: '1.png',
      title: 'Trail Runner Z2',
      label: 'UC-3990',
      tooltip: '',
    },
    category: 'Outdoor',
    price: '$110.00',
    trends: {
      label: 'Promo',
      variant: 'info',
    },
    stock: 12,
    rsvd: 3,
    tlvl: 250,
    supplier: {
      name: 'SwiftStock',
      logo: 'quickbooks.svg',
    }
  },
  {
    id: '3',
    productInfo: {
      image: '2.png',
      title: 'Urban Flex Knit Low…',
      label: 'KB-8820',
      tooltip: 'Urban Flex Knit Low Sneakers',
    },
    category: 'Runners',
    price: '$76.50',
    trends: {
      label: 'Clearance',
      variant: 'warning',
    },
    stock: 47,
    rsvd: 9,
    tlvl: 40,
    supplier: {
      name: 'VeloSource',
      logo: 'equacoin.svg',
    }
  }, 
  {
    id: '4',
    productInfo: {
      image: '13.png',
      title: 'Terra Trekking Max Pro…',
      label: 'WC-5510',
      tooltip: 'Terra Trekking Max Pro Hiker',
    },
    category: 'Sneakers',
    price: '$69.99',
    trends: {
      label: 'Slow Moving',
      variant: 'destructive',
    },
    stock: 0,
    rsvd: 0,
    tlvl: 100,
    supplier: {
      name: 'NexaSource',
      logo: 'coinhodler.svg',
    },
  },  
];

export const trackingDemoOrder: OrderListRow = {
  id: 'so-ams-4620',
  order: 'SO-AMS-4620',
  date: '1 Aug, 2025',
  customer: 'Jeroen de Jong',
  total: '$350.00',
  paymentStatus: { label: 'Paid', variant: 'success' },
  items: 2,
  deliveryStatus: { label: 'Shipped', variant: 'success' },
  carrier: { name: 'UPS Global', logo: 'ups.svg' },
  category: 'Sneakers',
};

export const allOrderListMockData: OrderListRow[] = [...orderListMockData, trackingDemoOrder];

export const orderDetailItemsByNumber: Record<string, OrderDetailItem[]> = {
  'SO-FL-5633': [
    {
      image: '15.png',
      title: 'Nike Air Max 270 React SE',
      sku: 'WM-8421',
      color: 'Beige',
      weight: '1.2',
    },
    {
      image: '9.png',
      title: 'Wave Strike Dynamic Boost Sneaker',
      sku: 'XR-0293',
      color: 'Red',
      weight: '0.9',
    },
  ],
  'SO-AMS-4620': [
    {
      image: '15.png',
      title: 'Nike Air Max 270 React SE',
      sku: 'WM-8421',
      color: 'Beige',
      weight: '1.2',
    },
    {
      image: '9.png',
      title: 'Wave Strike Dynamic Boost Sneaker',
      sku: 'XR-0293',
      color: 'Red',
      weight: '0.9',
    },
  ],
};

export const orderDetailsByNumber: Record<string, Partial<OrderDetailRow>> = {
  'SO-FL-5633': {
    subtotal: '$320.00',
    shippingCost: '$10.00',
    tax: '$20.00',
    total: '$350.00',
    shippingPriority: 'High',
    deliveryMethod: 'Express Delivery',
    currentStep: 3,
    originAddress: '1234 Industrial Way, Dallas, TX 75201',
    destinationAddress: '8458 Sunset Blvd #209, Los Angeles, CA 90069',
    shippingLabel: "Shipping to Jeroen's Home",
    shippingLine1: 'Prinsengracht 24',
    shippingLine2: '1015 DV Amsterdam, NL',
    shipmentNumber: 'SHP-FL-5633',
    trackingNumber: '1Z999AA10123456784',
    totalTime: '19 days, 7 hours',
    departureTime: '01 Aug, 2025 09:17',
    expectedArrival: '17 Apr, 2025 12:00',
  },
  'SO-AMS-4620': {
    subtotal: '$320.00',
    shippingCost: '$10.00',
    tax: '$20.00',
    total: '$350.00',
    shippingPriority: 'High',
    deliveryMethod: 'Express Delivery',
    currentStep: 3,
    originAddress: '1234 Industrial Way, Dallas, TX 75201',
    destinationAddress: '8458 Sunset Blvd #209, Los Angeles, CA 90069',
    shippingLabel: "Shipping to Jeroen's Home",
    shippingLine1: 'Prinsengracht 24',
    shippingLine2: '1015 DV Amsterdam, NL',
    shipmentNumber: 'SHP-3827462',
    trackingNumber: '1Z999AA10123456784',
    totalTime: '19 days, 7 hours',
    departureTime: '01 Aug, 2025 09:17',
    expectedArrival: '17 Apr, 2025 12:00',
  },
};

export const orderTrackingEventsByNumber: Record<string, OrderTrackingEventRow[]> = {
  'SO-FL-5633': [
    {
      id: 'evt-fl-1',
      title: 'Order Placed',
      date: '28 Jul, 2025 10:02',
      description: 'Shipment information received by seller',
      location: 'Silicon Valley, CA',
      sortOrder: 0,
    },
    {
      id: 'evt-fl-2',
      title: 'Picking',
      date: '28 Jul, 2025 11:02',
      description: 'Items being picked from inventory',
      sortOrder: 1,
    },
    {
      id: 'evt-fl-3',
      title: 'Packed',
      date: '28 Jul, 2025 12:27',
      description: 'Shipment information received by seller',
      sortOrder: 2,
    },
    {
      id: 'evt-fl-4',
      title: 'Shipped',
      date: '28 Jul, 2025 14:27',
      description: 'Package handed off to carrier',
      sortOrder: 3,
    },
  ],
  'SO-AMS-4620': [
    {
      id: 'evt-ams-1',
      title: 'Order Placed',
      date: '28 Jul, 2025 10:02',
      description: 'Shipment information received by seller',
      location: 'Silicon Valley, CA',
      sortOrder: 0,
    },
    {
      id: 'evt-ams-2',
      title: 'Picking',
      date: '28 Jul, 2025 11:02',
      description: 'Items being picked from inventory',
      sortOrder: 1,
    },
    {
      id: 'evt-ams-3',
      title: 'Packed',
      date: '28 Jul, 2025 12:27',
      description: 'Shipment information received by seller',
      sortOrder: 2,
    },
    {
      id: 'evt-ams-4',
      title: 'Shipped',
      date: '28 Jul, 2025 14:27',
      description: 'Package handed off to carrier',
      sortOrder: 3,
    },
  ],
};

export function deliveryStep(status?: string) {
  const normalized = (status ?? '').toLowerCase();
  if (normalized === 'delivered') return 4;
  if (normalized === 'shipped' || normalized === 'shipping' || normalized === 'in transit') return 3;
  if (normalized === 'packed') return 2;
  return 1;
}

function defaultTrackingEvents(order: OrderListRow): OrderTrackingEventRow[] {
  const events: OrderTrackingEventRow[] = [
    {
      id: `${order.id}-placed`,
      title: 'Order Placed',
      date: `${order.date} 10:02`,
      description: 'Shipment information received by seller',
      location: 'Dallas, TX',
      sortOrder: 0,
    },
  ];
  const step = deliveryStep(order.deliveryStatus.label);
  if (step >= 2) {
    events.push({
      id: `${order.id}-picking`,
      title: 'Picking',
      date: `${order.date} 11:02`,
      description: 'Items being picked from inventory',
      sortOrder: 1,
    });
  }
  if (step >= 3) {
    events.push({
      id: `${order.id}-packed`,
      title: 'Packed',
      date: `${order.date} 12:27`,
      description: 'Package prepared for carrier pickup',
      sortOrder: 2,
    });
    events.push({
      id: `${order.id}-shipped`,
      title: 'Shipped',
      date: `${order.date} 14:27`,
      description: 'Package handed off to carrier',
      sortOrder: 3,
    });
  }
  if (step >= 4) {
    events.push({
      id: `${order.id}-delivered`,
      title: 'Delivered',
      date: `${order.date} 16:00`,
      description: 'Package delivered to the destination address',
      sortOrder: 4,
    });
  }
  return events;
}

export function buildOrderDetail(
  order: OrderListRow,
  items: OrderItemRow[] = orderItemsMockData,
): OrderDetailRow {
  const extras = orderDetailsByNumber[order.order] ?? {};
  const totalAmount = parseMoney(extras.total ?? order.total);
  const shippingCost = extras.shippingCost ?? '$10.00';
  const tax = extras.tax ?? '$20.00';
  const subtotal = extras.subtotal ?? `$${(totalAmount - parseMoney(shippingCost) - parseMoney(tax)).toFixed(2)}`;
  const firstName = order.customer.split(' ')[0] || 'Customer';
  const detailItems =
    extras.detailItems ??
    orderDetailItemsByNumber[order.order] ??
    items.slice(0, Math.max(order.items, 1)).map((item) => ({
      image: item.productInfo.image,
      title: item.productInfo.tooltip || item.productInfo.title,
      sku: item.productInfo.label,
      color: item.color ?? 'Black',
      weight: item.weight ?? '1.0',
    }));

  return {
    ...order,
    subtotal,
    shippingCost,
    tax,
    total: extras.total ?? order.total,
    shipmentNumber: extras.shipmentNumber ?? `SHP-${order.order.replace(/^SO-/, '')}`,
    trackingNumber: extras.trackingNumber ?? `1Z${order.order.replace(/\W/g, '').slice(-12).padStart(12, '0')}`,
    shippingPriority: extras.shippingPriority ?? (order.deliveryStatus.label === 'Shipped' ? 'High' : 'Standard'),
    deliveryMethod: extras.deliveryMethod ?? 'Express Delivery',
    currentStep: extras.currentStep ?? deliveryStep(order.deliveryStatus.label),
    originAddress: extras.originAddress ?? '1234 Industrial Way, Dallas, TX 75201',
    destinationAddress: extras.destinationAddress ?? '8458 Sunset Blvd #209, Los Angeles, CA 90069',
    shippingLabel: extras.shippingLabel ?? `Shipping to ${firstName}'s Home`,
    shippingLine1: extras.shippingLine1 ?? 'Prinsengracht 24',
    shippingLine2: extras.shippingLine2 ?? '1015 DV Amsterdam, NL',
    totalTime: extras.totalTime ?? '19 days, 7 hours',
    departureTime: extras.departureTime ?? `${order.date} 09:17`,
    expectedArrival: extras.expectedArrival ?? `${order.date} 12:00`,
    detailItems,
    trackingEvents: extras.trackingEvents ?? orderTrackingEventsByNumber[order.order] ?? defaultTrackingEvents(order),
  };
}

export const defaultOrderDetail = buildOrderDetail(
  orderListMockData.find((row) => row.order === 'SO-FL-5633') ?? orderListMockData[0],
);

export const defaultTrackingDetail = buildOrderDetail(trackingDemoOrder);

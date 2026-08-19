import { formatMoney } from '../lib/format';
import type { CategoryListRow } from '../types';

export const categoryListMockData: CategoryListRow[] = [
  {
    id: '1',
    productInfo: { image: 'running-shoes.svg', title: 'Running Shoes', label: 'WM-8421' },
    productsQty: '120',
    totalEarnings: formatMoney(2583),
    status: { label: 'Active', variant: 'success' },
    featured: true,
  },
  {
    id: '2',
    productInfo: { image: 'flip-flops.svg', title: 'Flip-flops', label: 'UC-3990' },
    productsQty: '245',
    totalEarnings: formatMoney(10110),
    status: { label: 'Active', variant: 'success' },
    featured: false,
  },
  {
    id: '3',
    productInfo: { image: 'slip-on-shoe.svg', title: 'Slip-on-shoe', label: 'KB-8820' },
    productsQty: '560',
    totalEarnings: formatMoney(59476.5),
    status: { label: 'Inactive', variant: 'destructive' },
    featured: false,
  },
  {
    id: '4',
    productInfo: { image: 'sport-sneaker.svg', title: 'Sport Sneakers', label: 'LS-1033' },
    productsQty: '98',
    totalEarnings: formatMoney(102369.99),
    status: { label: 'Active', variant: 'success' },
    featured: true,
  },
  {
    id: '5',
    productInfo: { image: 'ski-boots.svg', title: 'Ski Boots', label: 'WC-5510' },
    productsQty: '33',
    totalEarnings: formatMoney(929),
    status: { label: 'Active', variant: 'success' },
    featured: true,
  },
  {
    id: '6',
    productInfo: {
      image: 'stiletto-heel.svg',
      title: 'Stiletto Heels',
      label: 'GH-7312',
    },
    productsQty: '140',
    totalEarnings: formatMoney(1659),
    status: {
      label: 'Inactive',
      variant: 'destructive',
    },
    featured: false,
  },
  {
    id: '7',
    productInfo: {
      image: 'football-boot.svg',
      title: 'Football Boots',
      label: 'GH-7312',
    },
    productsQty: '150',
    totalEarnings: formatMoney(7072),
    status: {
      label: 'Active',
      variant: 'success',
    },
    featured: true,
  },
  {
    id: '8',
    productInfo: {
      image: 'block-heel.svg',
      title: 'Block Heels',
      label: 'MS-8702',
    },
    productsQty: '65',
    totalEarnings: formatMoney(37119.5),
    status: {
      label: 'Active',
      variant: 'success',
    },
    featured: false,
  },
  {
    id: '9',
    productInfo: {
      image: 'hiking-boot.svg',
      title: 'Hiking Boots',
      label: 'BS-6112',
    },
    productsQty: '55',
    totalEarnings: formatMoney(498.75),
    status: {
      label: 'Active',
      variant: 'success',
    },
    featured: true,
  },
  {
    id: '10',
    productInfo: {
      image: 'ice-skate.svg',
      title: 'Ice Skates',
      label: 'HC-9031',
    },
    productsQty: '820',
    totalEarnings: formatMoney(230445),
    status: {
      label: 'Active',
      variant: 'success',
    },
    featured: true,
  },
  {
    id: '11',
    productInfo: {
      image: 'ankle-boot.svg',
      title: 'Casual Loafers',
      label: 'CL-1234',
    },
    productsQty: '95',
    totalEarnings: formatMoney(8450),
    status: {
      label: 'Active',
      variant: 'success',
    },
    featured: false,
  },
  {
    id: '12',
    productInfo: {
      image: 'casual-sneaker.svg',
      title: 'Formal Oxfords',
      label: 'FO-5678',
    },
    productsQty: '67',
    totalEarnings: formatMoney(12890),
    status: {
      label: 'Active',
      variant: 'success',
    },
    featured: true,
  },
  {
    id: '13',
    productInfo: {
      image: 'sandals.svg',
      title: 'Sandals',
      label: 'SD-9012',
    },
    productsQty: '234',
    totalEarnings: formatMoney(15670),
    status: {
      label: 'Inactive',
      variant: 'destructive',
    },
    featured: false,
  },
  {
    id: '14',
    productInfo: {
      image: 'snow-boot.svg',
      title: 'Winter Boots',
      label: 'WB-3456',
    },
    productsQty: '78',
    totalEarnings: formatMoney(22340),
    status: {
      label: 'Active',
      variant: 'success',
    },
    featured: true,
  },
  {
    id: '15',
    productInfo: {
      image: 'wedge-heel.svg',
      title: 'Dance Shoes',
      label: 'DS-7890',
    },
    productsQty: '45',
    totalEarnings: formatMoney(6780),
    status: {
      label: 'Active',
      variant: 'success',
    },
    featured: false,
  },
  {
    id: '16',
    productInfo: {
      image: 'wellies.svg',
      title: 'Climbing Shoes',
      label: 'CS-2345',
    },
    productsQty: '32',
    totalEarnings: formatMoney(4560),
    status: {
      label: 'Active',
      variant: 'success',
    },
    featured: true,
  },
  {
    id: '17',
    productInfo: {
      image: 'block-heel.svg',
      title: 'Work Boots',
      label: 'WB-6789',
    },
    productsQty: '156',
    totalEarnings: formatMoney(28900),
    status: {
      label: 'Active',
      variant: 'success',
    },
    featured: false,
  },
  {
    id: '18',
    productInfo: {
      image: 'slip-on-shoe.svg',
      title: 'Platform Heels',
      label: 'PH-0123',
    },
    productsQty: '89',
    totalEarnings: formatMoney(11230),
    status: {
      label: 'Inactive',
      variant: 'destructive',
    },
    featured: false,
  },
  {
    id: '19',
    productInfo: {
      image: 'ice-skate.svg',
      title: 'Athletic Cleats',
      label: 'AC-4567',
    },
    productsQty: '112',
    totalEarnings: formatMoney(18750),
    status: {
      label: 'Active',
      variant: 'success',
    },
    featured: true,
  },
  {
    id: '20',
    productInfo: {
      image: 'wellies.svg',
      title: 'Moccasins',
      label: 'MC-8901',
    },
    productsQty: '73',
    totalEarnings: formatMoney(9420),
    status: {
      label: 'Active',
      variant: 'success',
    },
    featured: false,
  },
  {
    id: '21',
    productInfo: {
      image: 'heeled-boot.svg',
      title: 'Espadrilles',
      label: 'ES-2345',
    },
    productsQty: '54',
    totalEarnings: formatMoney(7890),
    status: {
      label: 'Active',
      variant: 'success',
    },
    featured: true,
  },
  {
    id: '22',
    productInfo: {
      image: 'casual-sneaker.svg',
      title: 'Ballet Flats',
      label: 'BF-6789',
    },
    productsQty: '91',
    totalEarnings: formatMoney(13450),
    status: {
      label: 'Active',
      variant: 'success',
    },
    featured: false,
  },
  {
    id: '23',
    productInfo: {
      image: 'ankle-boot.svg',
      title: 'Wedge Heels',
      label: 'WH-0123',
    },
    productsQty: '68',
    totalEarnings: formatMoney(10670),
    status: {
      label: 'Inactive',
      variant: 'destructive',
    },
    featured: false,
  },
  {
    id: '24',
    productInfo: {
      image: 'ski-boots.svg',
      title: 'Slides',
      label: 'SL-4567',
    },
    productsQty: '187',
    totalEarnings: formatMoney(16890),
    status: {
      label: 'Active',
      variant: 'success',
    },
    featured: true,
  },
  {
    id: '25',
    productInfo: {
      image: 'stiletto-heel.svg',
      title: 'Mary Janes',
      label: 'MJ-8901',
    },
    productsQty: '42',
    totalEarnings: formatMoney(5340),
    status: {
      label: 'Active',
      variant: 'success',
    },
    featured: false,
  },
];

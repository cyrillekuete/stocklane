import type { ProductOptionCard, ProductVariantRow } from '../types';

export const defaultProductVariants: ProductVariantRow[] = [
  { id: '1', size: '40', color: 'White', price: '96.00', available: 'Yes', onHand: '24' },
  { id: '2', size: '39', color: 'White', price: '96.00', available: 'Yes', onHand: '18' },
  { id: '3', size: '42', color: 'Black', price: '96.00', available: 'Yes', onHand: '12' },
  { id: '4', size: '41', color: 'White', price: '96.00', available: 'No', onHand: '30' },
  { id: '5', size: '44', color: 'Red', price: '96.00', available: 'Yes', onHand: '27' },
  { id: '6', size: '43', color: 'Black', price: '96.00', available: 'No', onHand: '15' },
];

export const defaultProductOptions: ProductOptionCard[] = [
  {
    id: 'colors',
    name: 'Colors',
    isOpen: true,
    values: [
      { id: 'color-1', value: 'White' },
      { id: 'color-2', value: 'Black' },
      { id: 'color-3', value: 'Grey' },
      { id: 'color-4', value: 'Green' },
    ],
  },
  {
    id: 'size',
    name: 'Size',
    isOpen: false,
    values: [
      { id: 'size-1', value: 'XS' },
      { id: 'size-2', value: 'S' },
      { id: 'size-3', value: 'M' },
      { id: 'size-4', value: 'L' },
      { id: 'size-5', value: 'XL' },
    ],
  },
  {
    id: 'style',
    name: 'Style',
    isOpen: false,
    values: [
      { id: 'style-1', value: 'Casual' },
      { id: 'style-2', value: 'Formal' },
      { id: 'style-3', value: 'Sport' },
      { id: 'style-4', value: 'Vintage' },
    ],
  },
  {
    id: 'material',
    name: 'Material',
    isOpen: false,
    values: [
      { id: 'material-1', value: 'Cotton' },
      { id: 'material-2', value: 'Polyester' },
      { id: 'material-3', value: 'Wool' },
      { id: 'material-4', value: 'Leather' },
    ],
  },
];

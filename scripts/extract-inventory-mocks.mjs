import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

function readLines(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8').split(/\r?\n/);
}

function sliceFile(rel, start, end) {
  return readLines(rel).slice(start - 1, end).join('\n');
}

function ensureDir(rel) {
  fs.mkdirSync(path.join(root, rel), { recursive: true });
}

function rewriteConst(block, from, to, typeName) {
  return block
    .replace(from, to)
    .replace(/: IData\[\]/, `: ${typeName}[]`)
    .replace(/: OutboundStockData\[\]/, `: ${typeName}[]`)
    .replace(/: OrderItemData\[\]/, `: ${typeName}[]`)
    .replace(/: OrderListData\[\]/, `: ${typeName}[]`)
    .replace(/: DetailsOrdersData\[\]/, `: ${typeName}[]`)
    .replace(/: DetailsInvoiceData\[\]/, `: ${typeName}[]`);
}

function replaceRange(rel, start, end, replacement) {
  const filePath = path.join(root, rel);
  const fileLines = readLines(rel);
  const next = [...fileLines.slice(0, start - 1), replacement, ...fileLines.slice(end)];
  fs.writeFileSync(filePath, next.join('\n'));
}

ensureDir('src/store-inventory/data');

const products = rewriteConst(
  sliceFile('src/store-inventory/pages/tables/product-list.tsx', 93, 519),
  'const mockData: IData[]',
  'export const productListMockData: ProductListRow[]',
  'ProductListRow',
);

const categories = rewriteConst(
  sliceFile('src/store-inventory/pages/tables/category-list.tsx', 69, 410),
  'const mockData: IData[]',
  'export const categoryListMockData: CategoryListRow[]',
  'CategoryListRow',
);

const allStock = rewriteConst(
  sliceFile('src/store-inventory/pages/tables/all-stock.tsx', 119, 745),
  'const mockData: IData[]',
  'export const allStockMockData: AllStockRow[]',
  'AllStockRow',
);

const currentStock = rewriteConst(
  sliceFile('src/store-inventory/pages/tables/current-stock.tsx', 113, 689),
  'const mockData: IData[]',
  'export const currentStockMockData: CurrentStockRow[]',
  'CurrentStockRow',
);

const inboundStock = rewriteConst(
  sliceFile('src/store-inventory/pages/tables/inbound-stock.tsx', 138, 664),
  'const mockData: IData[]',
  'export const inboundStockMockData: InboundStockRow[]',
  'InboundStockRow',
);

const outboundStock = rewriteConst(
  sliceFile('src/store-inventory/pages/tables/outbound-stock.tsx', 134, 585),
  'const mockData: OutboundStockData[]',
  'export const outboundStockMockData: OutboundStockRow[]',
  'OutboundStockRow',
);

const stockPlanner = rewriteConst(
  sliceFile('src/store-inventory/pages/tables/stock-planner.tsx', 116, 792),
  'const mockData: IData[]',
  'export const stockPlannerMockData: StockPlannerRow[]',
  'StockPlannerRow',
);

const customers = rewriteConst(
  sliceFile('src/store-inventory/pages/tables/customer-list.tsx', 106, 683),
  'const mockData: IData[]',
  'export const customerListMockData: CustomerListRow[]',
  'CustomerListRow',
);

const orderItems = rewriteConst(
  sliceFile('src/store-inventory/pages/tables/order-list.tsx', 105, 194),
  'const orderItemsMockData: OrderItemData[]',
  'export const orderItemsMockData: OrderItemRow[]',
  'OrderItemRow',
);

const orders = rewriteConst(
  sliceFile('src/store-inventory/pages/tables/order-list.tsx', 196, 732),
  'const mockData: OrderListData[]',
  'export const orderListMockData: OrderListRow[]',
  'OrderListRow',
);

const detailsOrders = rewriteConst(
  sliceFile('src/store-inventory/pages/tables/details-orders.tsx', 185, 588),
  'const mockData: DetailsOrdersData[]',
  'export const detailsOrdersMockData: DetailsOrdersRow[]',
  'DetailsOrdersRow',
);

const detailsInvoice = rewriteConst(
  sliceFile('src/store-inventory/pages/tables/details-invoice.tsx', 63, 341),
  'const mockData: DetailsInvoiceData[]',
  'export const detailsInvoiceMockData: DetailsInvoiceRow[]',
  'DetailsInvoiceRow',
);

const productInfo = rewriteConst(
  sliceFile('src/store-inventory/pages/components/product-info-sheet.tsx', 71, 160),
  'const mockData: IData[]',
  'export const productInfoMockData: OrderItemRow[]',
  'OrderItemRow',
);

fs.writeFileSync(
  path.join(root, 'src/store-inventory/data/products.ts'),
  `import type { ProductListRow } from '../types';\n\n${products}\n`,
);

fs.writeFileSync(
  path.join(root, 'src/store-inventory/data/categories.ts'),
  `import type { CategoryListRow } from '../types';\n\n${categories}\n`,
);

fs.writeFileSync(
  path.join(root, 'src/store-inventory/data/stock.ts'),
  `import type {
  AllStockRow,
  CurrentStockRow,
  InboundStockRow,
  OutboundStockRow,
  StockPlannerRow,
} from '../types';

${allStock}

${currentStock}

${inboundStock}

${outboundStock}

${stockPlanner}
`,
);

fs.writeFileSync(
  path.join(root, 'src/store-inventory/data/customers.ts'),
  `import type { CustomerListRow } from '../types';\n\n${customers}\n`,
);

fs.writeFileSync(
  path.join(root, 'src/store-inventory/data/orders.ts'),
  `import type { DetailsInvoiceRow, DetailsOrdersRow, OrderItemRow, OrderListRow } from '../types';\n\n${orderItems}\n\n${orders}\n\n${detailsOrders}\n\n${detailsInvoice}\n\n${productInfo}\n`,
);

fs.writeFileSync(
  path.join(root, 'src/store-inventory/data/variants.ts'),
  `import type { ProductOptionCard, ProductVariantRow } from '../types';

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
`,
);

replaceRange(
  'src/store-inventory/pages/tables/product-list.tsx',
  93,
  519,
  `const mockData: IData[] = productListMockData;`,
);

replaceRange(
  'src/store-inventory/pages/tables/category-list.tsx',
  69,
  410,
  `const mockData: IData[] = categoryListMockData;`,
);

replaceRange(
  'src/store-inventory/pages/tables/all-stock.tsx',
  119,
  745,
  `const mockData: IData[] = allStockMockData;`,
);

replaceRange(
  'src/store-inventory/pages/tables/current-stock.tsx',
  113,
  689,
  `const mockData: IData[] = currentStockMockData;`,
);

replaceRange(
  'src/store-inventory/pages/tables/inbound-stock.tsx',
  138,
  664,
  `const mockData: IData[] = inboundStockMockData;`,
);

replaceRange(
  'src/store-inventory/pages/tables/outbound-stock.tsx',
  134,
  585,
  `const mockData: OutboundStockData[] = outboundStockMockData;`,
);

replaceRange(
  'src/store-inventory/pages/tables/stock-planner.tsx',
  116,
  792,
  `const mockData: IData[] = stockPlannerMockData;`,
);

replaceRange(
  'src/store-inventory/pages/tables/customer-list.tsx',
  106,
  683,
  `const mockData: IData[] = customerListMockData;`,
);

replaceRange(
  'src/store-inventory/pages/tables/order-list.tsx',
  105,
  732,
  `const orderItemsMockData: OrderItemData[] = sharedOrderItemsMockData;
const mockData: OrderListData[] = orderListMockData;`,
);

replaceRange(
  'src/store-inventory/pages/tables/details-orders.tsx',
  185,
  588,
  `const mockData: DetailsOrdersData[] = detailsOrdersMockData;`,
);

replaceRange(
  'src/store-inventory/pages/tables/details-invoice.tsx',
  63,
  341,
  `const mockData: DetailsInvoiceData[] = detailsInvoiceMockData;`,
);

replaceRange(
  'src/store-inventory/pages/components/product-info-sheet.tsx',
  71,
  160,
  `const mockData: IData[] = productInfoMockData;`,
);

console.log('Extracted inventory mock data and wired table fallbacks.');

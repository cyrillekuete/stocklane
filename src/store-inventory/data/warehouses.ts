import { stableId } from '../lib/format';
import type { WarehouseListRow } from '../types';

export const warehouseListMockData: WarehouseListRow[] = [
  {
    id: stableId('wh', 'MAIN'),
    code: 'MAIN',
    name: 'Main Warehouse',
    address: '12 Rue de Rivoli',
    city: 'Paris',
    country: 'FR',
    phone: '+33123456789',
    status: { label: 'Active', variant: 'success' },
    isDefault: true,
    skuCount: 18,
    onHand: 1240,
    created: '16 Jan, 2022',
    updated: '19 Aug, 2026',
  },
  {
    id: stableId('wh', 'TX-Hub'),
    code: 'TX-HUB',
    name: 'Texas Hub',
    address: '4400 Commerce St',
    city: 'Dallas',
    country: 'US',
    phone: '+12145550112',
    status: { label: 'Active', variant: 'success' },
    isDefault: false,
    skuCount: 6,
    onHand: 210,
    created: '4 Mar, 2023',
    updated: '12 Aug, 2026',
  },
];

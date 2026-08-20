export const APP_ROLES = ['admin', 'cashier', 'store_keeper'] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin',
  cashier: 'Cashier',
  store_keeper: 'Store Keeper',
};

/** Feature areas used for menu filtering and route guards. */
export type AppPermission =
  | 'dashboard'
  | 'inventory'
  | 'warehouses'
  | 'pos'
  | 'products'
  | 'categories'
  | 'orders'
  | 'customers'
  | 'settings'
  | 'users';

const ROLE_PERMISSIONS: Record<AppRole, ReadonlySet<AppPermission>> = {
  admin: new Set([
    'dashboard',
    'inventory',
    'warehouses',
    'pos',
    'products',
    'categories',
    'orders',
    'customers',
    'settings',
    'users',
  ]),
  cashier: new Set(['dashboard', 'pos', 'orders', 'customers']),
  store_keeper: new Set([
    'dashboard',
    'inventory',
    'warehouses',
    'products',
    'categories',
  ]),
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && (APP_ROLES as readonly string[]).includes(value);
}

export function normalizeRole(value: unknown): AppRole | null {
  if (isAppRole(value)) return value;
  if (typeof value !== 'string') return null;
  const lowered = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (lowered === 'storekeeper') return 'store_keeper';
  return isAppRole(lowered) ? lowered : null;
}

export function roleHasPermission(role: AppRole | null | undefined, permission: AppPermission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].has(permission);
}

export function permissionsForRole(role: AppRole): AppPermission[] {
  return [...ROLE_PERMISSIONS[role]];
}

/** Map store-inventory path prefixes to permissions. */
export function permissionForPath(pathname: string): AppPermission | null {
  const path = pathname.replace(/^\/store-inventory\/?/, '').split('?')[0];
  if (!path || path === 'dashboard' || path === 'dark-sidebar') return 'dashboard';
  if (
    path.startsWith('all-stock') ||
    path.startsWith('current-stock') ||
    path.startsWith('inbound-stock') ||
    path.startsWith('outbound-stock') ||
    path.startsWith('stock-planner') ||
    path.startsWith('per-product-stock') ||
    path.startsWith('track-shipping') ||
    path.startsWith('create-shipping-label')
  ) {
    return 'inventory';
  }
  if (path.startsWith('warehouses')) return 'warehouses';
  if (path.startsWith('pos')) return 'pos';
  if (
    path.startsWith('product') ||
    path.startsWith('create-product') ||
    path.startsWith('edit-product') ||
    path.startsWith('manage-variants')
  ) {
    return 'products';
  }
  if (path.startsWith('category')) return 'categories';
  if (path.startsWith('order')) return 'orders';
  if (path.startsWith('customer')) return 'customers';
  if (path.startsWith('settings')) return 'settings';
  if (path.startsWith('users')) return 'users';
  return null;
}

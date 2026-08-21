export const APP_ROLES = ['admin', 'cashier', 'store_keeper'] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin',
  cashier: 'Cashier',
  store_keeper: 'Store Keeper',
};

/** Feature areas used for menu filtering and route guards. */
export const APP_PERMISSIONS = [
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
] as const;

export type AppPermission = (typeof APP_PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<AppPermission, string> = {
  dashboard: 'Dashboard',
  inventory: 'Inventory',
  warehouses: 'Warehouses',
  pos: 'Point of Sale',
  products: 'Products',
  categories: 'Categories',
  orders: 'Orders',
  customers: 'Customers',
  settings: 'Settings',
  users: 'User Management',
};

export const PERMISSION_DESCRIPTIONS: Record<AppPermission, string> = {
  dashboard: 'Store overview and dashboard pages',
  inventory: 'Stock levels, inbound, outbound, and shipping',
  warehouses: 'Warehouse list and locations',
  pos: 'Register and sale history',
  products: 'Product catalog, variants, and editing',
  categories: 'Category list and organization',
  orders: 'Orders, details, and tracking',
  customers: 'Customer list and profiles',
  settings: 'Store settings',
  users: 'Create and manage staff users (admins only)',
};

export const PERMISSION_HOME: Record<AppPermission, string> = {
  dashboard: '/store-inventory/dashboard',
  inventory: '/store-inventory/all-stock',
  warehouses: '/store-inventory/warehouses',
  pos: '/store-inventory/pos',
  products: '/store-inventory/product-list',
  categories: '/store-inventory/category-list',
  orders: '/store-inventory/order-list',
  customers: '/store-inventory/customer-list',
  settings: '/store-inventory/settings-modal',
  users: '/store-inventory/users',
};

const ROLE_PERMISSIONS: Record<AppRole, readonly AppPermission[]> = {
  admin: APP_PERMISSIONS,
  cashier: ['dashboard', 'pos', 'orders', 'customers'],
  store_keeper: ['dashboard', 'inventory', 'warehouses', 'products', 'categories'],
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && (APP_ROLES as readonly string[]).includes(value);
}

export function isAppPermission(value: unknown): value is AppPermission {
  return typeof value === 'string' && (APP_PERMISSIONS as readonly string[]).includes(value);
}

export function normalizeRole(value: unknown): AppRole | null {
  if (isAppRole(value)) return value;
  if (typeof value !== 'string') return null;
  const lowered = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (lowered === 'storekeeper') return 'store_keeper';
  return isAppRole(lowered) ? lowered : null;
}

export function permissionsForRole(role: AppRole): AppPermission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export function normalizePermissions(value: unknown): AppPermission[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isAppPermission))];
}

/** Resolve effective permissions. Admins always have the full set. */
export function resolveUserPermissions(
  role: AppRole | null | undefined,
  stored?: unknown,
): AppPermission[] {
  if (role === 'admin') return permissionsForRole('admin');
  if (stored === undefined || stored === null) {
    return role ? permissionsForRole(role) : [];
  }
  return normalizePermissions(stored);
}

export function hasAppPermission(
  role: AppRole | null | undefined,
  stored: unknown,
  permission: AppPermission,
): boolean {
  return resolveUserPermissions(role, stored).includes(permission);
}

export function roleHasPermission(role: AppRole | null | undefined, permission: AppPermission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function permissionsMatchRole(role: AppRole, permissions: readonly AppPermission[]): boolean {
  const defaults = ROLE_PERMISSIONS[role];
  if (defaults.length !== permissions.length) return false;
  const set = new Set(permissions);
  return defaults.every((item) => set.has(item));
}

export function firstAllowedPath(permissions: readonly AppPermission[]): string | null {
  for (const permission of APP_PERMISSIONS) {
    if (permissions.includes(permission)) return PERMISSION_HOME[permission];
  }
  return null;
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

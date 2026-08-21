const fs = require('fs');
const path = require('path');
const root = __dirname;
const raw = require(path.join(root, 'i18n-string-catalog.json'));

const isNoise = (en, key) => {
  if (!en || en.length < 2) return true;
  if (/set[A-Z]\w+\(/.test(en) || /handleOpen|openDelete|title=\\"/.test(en)) return true;
  if (/^>|" >$|^\)$/.test(en)) return true;
  if (/America\/|Europe\/|Asia\/|Australia\//.test(en)) return true; // IANA zones — keep codes, not translate
  if (/Completed phase one|Jenny attended|Nature Photography|Good for Startups/.test(en)) return true; // mock activity copy
  if (/Cloud Shift|Titan Edge|FinSight|Closed deal|Follow-up scheduled/.test(en)) return true;
  if (/Nova Hawthorne|Adrian Cross|Skylar Frost|Jane Perez|Jessy is typing|HR Team/.test(en)) return true;
  if (/This is excellent|I have checked|Haven't seen|Checking the build|Tomorrow, I will|Hello!/.test(en)) return true;
  if (/wants to join chat|1 day ago/.test(en)) return true;
  if (/Project management|Ensures healthcare|Notes management|DevOps platform|Building web experiences/.test(en)) return true;
  if (/Jira|Inferno|Evernote|Gitlab|Google webdev/.test(en) && en.length < 20) return true;
  if (en === 'Function not implemented.') return true;
  if (/^Passwords don$/.test(en)) return true;
  if (/Sign in to manage inventory, point of sale,$/.test(en)) return true; // partial of full string
  return false;
};

// Manual additions the extractor missed (apostrophes / ternary branches)
const extras = {
  AUTH: [
    { key: 'AUTH.SIGNIN.SEND_RESET_LINK', en: 'Send Reset Link' },
    { key: 'AUTH.CHANGE.UPDATE_PASSWORD', en: 'Update Password' },
    { key: 'AUTH.VALIDATION.PASSWORDS_DONT_MATCH', en: "Passwords don't match" },
    { key: 'AUTH.ERROR.UNEXPECTED', en: 'An unexpected error occurred. Please try again.' },
    { key: 'AUTH.ERROR.AUTH_FAILED', en: 'Authentication failed' },
    { key: 'AUTH.ERROR.AUTH_UNEXPECTED', en: 'An unexpected error occurred during authentication' },
    { key: 'AUTH.ERROR.FAILED_UPDATE_PASSWORD', en: 'Failed to update password.' },
    { key: 'AUTH.CHANGE.SUCCESS_READY', en: 'You can now set your new password' },
    { key: 'AUTH.CHANGE.SUCCESS_UPDATED', en: 'Password updated successfully.' },
    { key: 'AUTH.CHANGE.HINT_STRONG', en: 'Choose a strong password for your account.' },
    { key: 'AUTH.CHANGE.HINT_EMAIL_LINK', en: 'Open this page from your password reset email link.' },
    { key: 'AUTH.ERROR.AUTH_DESCRIPTION', en: 'Authentication error. Please try again.' },
    { key: 'AUTH.ERROR.FAILED_COMPLETE', en: 'Failed to complete authentication' },
    { key: 'AUTH.SIGNIN.DEMO_HINT', en: 'Demo: admin@stocklane.local / Admin123 · Cashier & Store Keeper accounts use the same password pattern.' },
  ],
  LAYOUT: [
    { key: 'LAYOUT.USER.GUEST', en: 'Guest' },
    { key: 'LAYOUT.USER.NOT_SIGNED_IN', en: 'Not signed in' },
    { key: 'LAYOUT.SIDEBAR.SOON', en: 'Soon' },
  ],
  COMMON: [
    { key: 'COMMON.SAVE', en: 'Save' },
    { key: 'COMMON.CANCEL', en: 'Cancel' },
    { key: 'COMMON.DELETE', en: 'Delete' },
    { key: 'COMMON.EDIT', en: 'Edit' },
    { key: 'COMMON.SEARCH', en: 'Search' },
    { key: 'COMMON.CLOSE', en: 'Close' },
    { key: 'COMMON.ADD', en: 'Add' },
    { key: 'COMMON.CREATE', en: 'Create' },
    { key: 'COMMON.UPDATE', en: 'Update' },
    { key: 'COMMON.EXPORT', en: 'Export' },
    { key: 'COMMON.IMPORT', en: 'Import' },
    { key: 'COMMON.FILTER', en: 'Filter...' },
    { key: 'COMMON.SEARCH_ELLIPSIS', en: 'Search...' },
    { key: 'COMMON.LOADING', en: 'Loading...' },
    { key: 'COMMON.SAVING', en: 'Saving...' },
    { key: 'COMMON.JUST_NOW', en: 'Just now' },
    { key: 'COMMON.ACTIONS', en: 'Actions' },
    { key: 'COMMON.STATUS', en: 'Status' },
    { key: 'COMMON.YES', en: 'Yes' },
    { key: 'COMMON.NO', en: 'No' },
    { key: 'COMMON.OPTIONAL', en: 'Optional' },
    { key: 'COMMON.REQUIRED', en: 'Required' },
    { key: 'COMMON.ENABLED', en: 'Enabled' },
    { key: 'COMMON.DISABLED', en: 'Disabled' },
    { key: 'COMMON.AVAILABLE', en: 'Available' },
    { key: 'COMMON.UNAVAILABLE', en: 'Unavailable' },
    { key: 'COMMON.CLEAR', en: 'Clear' },
    { key: 'COMMON.APPLY', en: 'Apply' },
    { key: 'COMMON.RESET', en: 'Reset' },
    { key: 'COMMON.VIEW', en: 'View' },
    { key: 'COMMON.MORE', en: 'More' },
    { key: 'COMMON.NEXT', en: 'Next' },
    { key: 'COMMON.PREVIOUS', en: 'Previous' },
    { key: 'COMMON.CONFIRM', en: 'Confirm' },
    { key: 'COMMON.DISCARD', en: 'Discard' },
  ],
  'ROLES/PERMISSIONS': [
    { key: 'ROLES.ADMIN', en: 'Admin' },
    { key: 'ROLES.CASHIER', en: 'Cashier' },
    { key: 'ROLES.STORE_KEEPER', en: 'Store Keeper' },
    { key: 'PERMISSIONS.DASHBOARD', en: 'Dashboard' },
    { key: 'PERMISSIONS.INVENTORY', en: 'Inventory' },
    { key: 'PERMISSIONS.WAREHOUSES', en: 'Warehouses' },
    { key: 'PERMISSIONS.POS', en: 'Point of Sale' },
    { key: 'PERMISSIONS.PRODUCTS', en: 'Products' },
    { key: 'PERMISSIONS.CATEGORIES', en: 'Categories' },
    { key: 'PERMISSIONS.ORDERS', en: 'Orders' },
    { key: 'PERMISSIONS.CUSTOMERS', en: 'Customers' },
    { key: 'PERMISSIONS.SETTINGS', en: 'Settings' },
    { key: 'PERMISSIONS.USERS', en: 'User Management' },
    { key: 'PERMISSIONS.DESC.DASHBOARD', en: 'Store overview and dashboard pages' },
    { key: 'PERMISSIONS.DESC.INVENTORY', en: 'Stock levels, inbound, outbound, and shipping' },
    { key: 'PERMISSIONS.DESC.WAREHOUSES', en: 'Warehouse list and locations' },
    { key: 'PERMISSIONS.DESC.POS', en: 'Register and sale history' },
    { key: 'PERMISSIONS.DESC.PRODUCTS', en: 'Product catalog, variants, and editing' },
    { key: 'PERMISSIONS.DESC.CATEGORIES', en: 'Category list and organization' },
    { key: 'PERMISSIONS.DESC.ORDERS', en: 'Orders, details, and tracking' },
    { key: 'PERMISSIONS.DESC.CUSTOMERS', en: 'Customer list and profiles' },
    { key: 'PERMISSIONS.DESC.SETTINGS', en: 'Store settings' },
    { key: 'PERMISSIONS.DESC.USERS', en: 'Create and manage staff users (admins only)' },
  ],
  STATUS: [
    { key: 'STATUS.ACTIVE', en: 'Active' },
    { key: 'STATUS.INACTIVE', en: 'Inactive' },
    { key: 'STATUS.DRAFT', en: 'Draft' },
    { key: 'STATUS.ARCHIVED', en: 'Archived' },
    { key: 'STATUS.LIVE', en: 'Live' },
    { key: 'STATUS.INVITED', en: 'Invited' },
    { key: 'STATUS.BANNED', en: 'Banned' },
    { key: 'STATUS.PAYMENT.PAID', en: 'Paid' },
    { key: 'STATUS.PAYMENT.PENDING', en: 'Pending' },
    { key: 'STATUS.PAYMENT.UNPAID', en: 'Unpaid' },
    { key: 'STATUS.PAYMENT.FAILED', en: 'Failed' },
    { key: 'STATUS.PAYMENT.CANCELLED', en: 'Cancelled' },
    { key: 'STATUS.DELIVERY.PENDING', en: 'Pending' },
    { key: 'STATUS.DELIVERY.PACKED', en: 'Packed' },
    { key: 'STATUS.DELIVERY.SHIPPED', en: 'Shipped' },
    { key: 'STATUS.DELIVERY.DELIVERED', en: 'Delivered' },
    { key: 'STATUS.DELIVERY.ON_HOLD', en: 'On Hold' },
    { key: 'STATUS.DELIVERY.CANCELED', en: 'Canceled' },
    { key: 'STATUS.DELIVERY.RETURNED', en: 'Returned' },
    { key: 'STATUS.STOCK.IN_STOCK', en: 'In stock' },
    { key: 'STATUS.STOCK.LOW_STOCK', en: 'Low stock' },
    { key: 'STATUS.STOCK.OUT_OF_STOCK', en: 'Out of stock' },
    { key: 'STATUS.STOCK.AVAILABLE', en: 'Available' },
    { key: 'STATUS.STOCK.ALLOCATED', en: 'Allocated' },
    { key: 'STATUS.STOCK.IN_TRANSIT', en: 'In Transit' },
    { key: 'STATUS.STOCK.PICKING', en: 'Picking' },
    { key: 'STATUS.FLOW.FAST_MOVING', en: 'Fast Moving' },
    { key: 'STATUS.FLOW.SLOW_MOVING', en: 'Slow Moving' },
    { key: 'STATUS.FLOW.CLEARANCE', en: 'Clearance' },
    { key: 'STATUS.FLOW.PROMO', en: 'Promo' },
    { key: 'STATUS.FLOW.SEASONAL', en: 'Seasonal' },
    { key: 'STATUS.FLOW.MUST_ACT', en: 'Must Act' },
    { key: 'STATUS.PAYMENT_METHOD.CASH', en: 'Cash' },
    { key: 'STATUS.PAYMENT_METHOD.ACCOUNT', en: 'Account' },
    { key: 'STATUS.PAYMENT_METHOD.CREDIT', en: 'Credit' },
    { key: 'STATUS.PAYMENT_METHOD.MTN', en: 'MTN Mobile Money' },
    { key: 'STATUS.PAYMENT_METHOD.ORANGE', en: 'Orange Money' },
    { key: 'STATUS.PAYMENT_METHOD.BANK', en: 'Bank Transfer' },
    { key: 'STATUS.PAYMENT_METHOD.CARD', en: 'Card' },
    { key: 'STATUS.PAYMENT_METHOD.MOBILE', en: 'Mobile' },
  ],
  MENU: [
    { key: 'MENU.DASHBOARDS', en: 'Dashboards' },
    { key: 'MENU.DASHBOARDS.DEFAULT', en: 'Default' },
    { key: 'MENU.DASHBOARDS.DARK_SIDEBAR', en: 'Dark Sidebar' },
    { key: 'MENU.HEADING.STORE_INVENTORY', en: 'Store Inventory' },
    { key: 'MENU.INVENTORY', en: 'Inventory' },
    { key: 'MENU.INVENTORY.ALL_STOCK', en: 'All Stock' },
    { key: 'MENU.INVENTORY.CURRENT_STOCK', en: 'Current Stock' },
    { key: 'MENU.INVENTORY.INBOUND_STOCK', en: 'Inbound Stock' },
    { key: 'MENU.INVENTORY.OUTBOUND_STOCK', en: 'Outbound Stock' },
    { key: 'MENU.INVENTORY.STOCK_PLANNER', en: 'Stock Planner' },
    { key: 'MENU.INVENTORY.PER_PRODUCT_STOCK', en: 'Per Product Stock' },
    { key: 'MENU.INVENTORY.TRACK_SHIPPING', en: 'Track Shipping' },
    { key: 'MENU.INVENTORY.CREATE_SHIPPING_LABEL', en: 'Create Shipping Label' },
    { key: 'MENU.WAREHOUSES', en: 'Warehouses' },
    { key: 'MENU.WAREHOUSES.LIST', en: 'Warehouse List' },
    { key: 'MENU.POS', en: 'Point of Sale' },
    { key: 'MENU.POS.REGISTER', en: 'Register' },
    { key: 'MENU.POS.SALE_HISTORY', en: 'Sale History' },
    { key: 'MENU.PRODUCTS', en: 'Products' },
    { key: 'MENU.PRODUCTS.LIST', en: 'Product List' },
    { key: 'MENU.PRODUCTS.DETAILS', en: 'Product Details' },
    { key: 'MENU.PRODUCTS.CREATE', en: 'Create Product' },
    { key: 'MENU.PRODUCTS.MANAGE_VARIANTS', en: 'Manage Variants' },
    { key: 'MENU.PRODUCTS.EDIT', en: 'Edit Product' },
    { key: 'MENU.CATEGORIES', en: 'Categories' },
    { key: 'MENU.CATEGORIES.LIST', en: 'Category List' },
    { key: 'MENU.ORDERS', en: 'Orders' },
    { key: 'MENU.ORDERS.LIST', en: 'Order List' },
    { key: 'MENU.ORDERS.LIST_PRODUCTS', en: 'Order List - Products' },
    { key: 'MENU.ORDERS.DETAILS', en: 'Order Details' },
    { key: 'MENU.ORDERS.TRACKING', en: 'Order Tracking' },
    { key: 'MENU.CUSTOMER', en: 'Customer' },
    { key: 'MENU.CUSTOMER.LIST', en: 'Customer List' },
    { key: 'MENU.CUSTOMER.DETAILS', en: 'Customer Details' },
    { key: 'MENU.TEAM', en: 'Team' },
    { key: 'MENU.TEAM.USER_MANAGEMENT', en: 'User Management' },
    { key: 'MENU.SETTINGS', en: 'Settings' },
    { key: 'MENU.SETTINGS.MODAL', en: 'Settings(Modal View)' },
  ],
  WAREHOUSES: [
    { key: 'WAREHOUSES.ALL', en: 'All warehouses' },
    { key: 'WAREHOUSES.ACTIVATE_FIRST', en: 'Activate a warehouse first' },
    { key: 'WAREHOUSES.EMPTY_ACTIVE', en: 'No Active warehouses. Activate a warehouse before receiving stock, creating products, or using POS.' },
    { key: 'WAREHOUSES.CANNOT_DELETE_LAST', en: 'Cannot delete the last warehouse' },
    { key: 'WAREHOUSES.MOVE_OR_CLEAR_STOCK', en: 'Move or clear {count} on-hand units before deleting this warehouse' },
  ],
  SETTINGS: [
    { key: 'SETTINGS.DISCARD_CONFIRM', en: 'Discard unsaved settings changes?' },
    { key: 'SETTINGS.LOADING', en: 'Loading settings…' },
    { key: 'SETTINGS.NO_ORDERS_YET', en: 'No orders yet' },
    { key: 'SETTINGS.TAB.GENERAL', en: 'General Settings' },
    { key: 'SETTINGS.TAB.PAYMENTS', en: 'Payments' },
    { key: 'SETTINGS.TAB.CHECKOUT', en: 'Checkout' },
    { key: 'SETTINGS.TAB.SHIPPING', en: 'Shipping & Delivery' },
    { key: 'SETTINGS.TAB.LOCATIONS', en: 'Locations' },
    { key: 'SETTINGS.TAB.SECURITY', en: 'Security' },
    { key: 'SETTINGS.TAB.NOTIFICATION', en: 'Notification' },
  ],
  TOASTS: [
    { key: 'TOASTS.POS.INSUFFICIENT_STOCK', en: 'Not enough available stock for one or more items' },
    { key: 'TOASTS.POS.INSUFFICIENT_BALANCE', en: 'Not enough account balance for this sale' },
    { key: 'TOASTS.POS.AMOUNT_TENDERED', en: 'Amount tendered is less than the total' },
    { key: 'TOASTS.POS.TOTAL_MISMATCH', en: 'Sale totals changed — refresh the cart and try again' },
    { key: 'TOASTS.POS.VOID_TOO_OLD', en: 'Sales older than {days} days cannot be voided' },
    { key: 'TOASTS.POS.ALREADY_VOIDED', en: 'Sale is already voided' },
    { key: 'TOASTS.POS.NOT_SELLABLE', en: 'A cart product is no longer available for sale' },
    { key: 'TOASTS.POS.ITEM_NEEDS_PRODUCT', en: 'Each sale item must include a product' },
    { key: 'TOASTS.POS.CUSTOMER_REQUIRED', en: 'Select a customer for account or credit sales' },
    { key: 'TOASTS.OPTIMISTIC_REVERT', en: 'Something went wrong. Changes were reverted.' },
    { key: 'TOASTS.USERS.CREATED', en: 'User created' },
    { key: 'TOASTS.USERS.UPDATED', en: 'User updated' },
    { key: 'TOASTS.USERS.PERMISSIONS_UPDATED', en: 'Permissions updated' },
    { key: 'TOASTS.USERS.PASSWORD_UPDATED', en: 'Password updated' },
    { key: 'TOASTS.USERS.DELETED', en: 'User deleted' },
  ],
};

const curated = { ...extras };

for (const [domain, items] of Object.entries(raw)) {
  const target = domain === 'TOASTS/ERRORS' ? 'TOASTS' : domain === 'ROLES/PERMISSIONS' ? 'ROLES/PERMISSIONS' : domain;
  if (!curated[target]) curated[target] = [];
  const seen = new Set(curated[target].map((x) => x.en));
  for (const item of items) {
    if (isNoise(item.en, item.key)) continue;
    if (seen.has(item.en)) continue;
    // skip role/permission strings already in ROLES section when in AUTH
    if (target === 'AUTH' && /^(Admin|Cashier|Store Keeper|Dashboard|Inventory|Warehouses|Point of Sale|Products|Categories|Orders|Customers|Settings|User Management)$/.test(item.en)) continue;
    if (target === 'AUTH' && /Store overview|Stock levels|Warehouse list|Register and sale|Product catalog|Category list|Orders, details|Customer list|Store settings|Create and manage staff/.test(item.en)) continue;
    seen.add(item.en);
    curated[target].push({ key: item.key, en: item.en, files: item.files });
  }
}

// flatten en draft for messages
const enFlat = {};
for (const [domain, items] of Object.entries(curated)) {
  for (const item of items) {
    enFlat[item.key] = item.en;
  }
}

fs.writeFileSync(path.join(root, 'i18n-curated-catalog.json'), JSON.stringify(curated, null, 2));
fs.writeFileSync(path.join(root, 'i18n-en-ready.json'), JSON.stringify(enFlat, null, 2));

let md = ['# Curated Stocklane i18n catalog', '', `Keys: ${Object.keys(enFlat).length}`, ''];
for (const [domain, items] of Object.entries(curated)) {
  md.push(`## ${domain}`, '');
  for (const i of items) {
    md.push(`- \`${i.key}\`: ${JSON.stringify(i.en)}`);
  }
  md.push('');
}
fs.writeFileSync(path.join(root, 'i18n-curated-catalog.md'), md.join('\n'));
console.log('keys', Object.keys(enFlat).length);
for (const [d, items] of Object.entries(curated)) console.log(d, items.length);

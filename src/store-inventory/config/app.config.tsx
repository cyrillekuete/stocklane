import {
  Boxes,
  ClipboardList,
  LayoutGrid,
  LayoutList,
  Package,
  Settings2,
  ShoppingCart,
  Users,
  UsersRound,
  Warehouse,
} from 'lucide-react';
import type { AppPermission } from '@/auth/lib/roles';
import { MenuConfig } from './types';

export type InventoryMenuItem = {
  title?: string;
  icon?: MenuConfig[number]['icon'];
  path?: string;
  heading?: string;
  children?: InventoryMenuItem[];
  disabled?: boolean;
  permission?: AppPermission;
};

export const MENU_SIDEBAR: InventoryMenuItem[] = [
  {
    title: 'Dashboards',
    icon: LayoutGrid,
    permission: 'dashboard',
    children: [
      { title: 'Default', path: '/store-inventory/dashboard', permission: 'dashboard' },
      { title: 'Dark Sidebar', path: '/store-inventory/dark-sidebar', permission: 'dashboard' },
    ],
  },
  { heading: 'Store Inventory' },
  {
    title: 'Inventory',
    icon: Boxes,
    permission: 'inventory',
    children: [
      { title: 'All Stock', path: '/store-inventory/all-stock', permission: 'inventory' },
      { title: 'Current Stock', path: '/store-inventory/current-stock', permission: 'inventory' },
      { title: 'Inbound Stock', path: '/store-inventory/inbound-stock', permission: 'inventory' },
      { title: 'Outbound Stock', path: '/store-inventory/outbound-stock', permission: 'inventory' },
      { title: 'Stock Planner', path: '/store-inventory/stock-planner', permission: 'inventory' },
      {
        title: 'Per Product Stock',
        path: '/store-inventory/per-product-stock',
        permission: 'inventory',
      },
      {
        title: 'Track Shipping',
        path: '/store-inventory/track-shipping',
        permission: 'inventory',
      },
      {
        title: 'Create Shipping Label',
        path: '/store-inventory/create-shipping-label',
        permission: 'inventory',
      },
    ],
  },
  {
    title: 'Warehouses',
    icon: Warehouse,
    permission: 'warehouses',
    children: [
      { title: 'Warehouse List', path: '/store-inventory/warehouses', permission: 'warehouses' },
    ],
  },
  {
    title: 'Point of Sale',
    icon: ShoppingCart,
    permission: 'pos',
    children: [
      { title: 'Register', path: '/store-inventory/pos', permission: 'pos' },
      { title: 'Sale History', path: '/store-inventory/pos/sales', permission: 'pos' },
    ],
  },
  {
    title: 'Products',
    icon: Package,
    permission: 'products',
    children: [
      { title: 'Product List', path: '/store-inventory/product-list', permission: 'products' },
      {
        title: 'Product Details',
        path: '/store-inventory/product-details',
        permission: 'products',
      },
      { title: 'Create Product', path: '/store-inventory/create-product', permission: 'products' },
      {
        title: 'Manage Variants',
        path: '/store-inventory/manage-variants',
        permission: 'products',
      },
      { title: 'Edit Product', path: '/store-inventory/edit-product', permission: 'products' },
    ],
  },
  {
    title: 'Categories',
    icon: LayoutList,
    permission: 'categories',
    children: [
      { title: 'Category List', path: '/store-inventory/category-list', permission: 'categories' },
    ],
  },
  {
    title: 'Orders',
    icon: ClipboardList,
    permission: 'orders',
    children: [
      { title: 'Order List', path: '/store-inventory/order-list', permission: 'orders' },
      {
        title: 'Order List - Products',
        path: '/store-inventory/order-list-products',
        permission: 'orders',
      },
      { title: 'Order Details', path: '/store-inventory/order-details', permission: 'orders' },
      { title: 'Order Tracking', path: '/store-inventory/order-tracking', permission: 'orders' },
    ],
  },
  {
    title: 'Customer',
    icon: UsersRound,
    permission: 'customers',
    children: [
      { title: 'Customer List', path: '/store-inventory/customer-list', permission: 'customers' },
      {
        title: 'Customer Details',
        path: '/store-inventory/customer-list-details',
        permission: 'customers',
      },
    ],
  },
  {
    title: 'Team',
    icon: Users,
    permission: 'users',
    children: [
      { title: 'User Management', path: '/store-inventory/users', permission: 'users' },
    ],
  },
  {
    title: 'Settings',
    icon: Settings2,
    permission: 'settings',
    children: [
      {
        title: 'Settings(Modal View)',
        path: '/store-inventory/settings-modal',
        permission: 'settings',
      },
    ],
  },
];

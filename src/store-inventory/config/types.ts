import type { LucideIcon } from 'lucide-react';
import type { AppPermission } from '@/auth/lib/roles';

export interface MenuItem {
  title?: string;
  icon?: LucideIcon;
  path?: string;
  rootPath?: string;
  childrenIndex?: number;
  heading?: string;
  children?: MenuConfig;
  disabled?: boolean;
  collapse?: boolean;
  collapseTitle?: string;
  expandTitle?: string;
  badge?: string;
  separator?: boolean;
  permission?: AppPermission;
}

export type MenuConfig = MenuItem[];

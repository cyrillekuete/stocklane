import { JSX, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useT } from '@/i18n/use-t';
import { MENU_SIDEBAR } from '@/store-inventory/config/app.config';
import { MenuConfig, MenuItem } from '@/store-inventory/config/types';
import { cn } from '@/lib/utils';
import {
  AccordionMenu,
  AccordionMenuClassNames,
  AccordionMenuGroup,
  AccordionMenuItem,
  AccordionMenuLabel,
  AccordionMenuSub,
  AccordionMenuSubContent,
  AccordionMenuSubTrigger,
} from '@/components/ui/accordion-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const MENU_CLASS_NAMES: AccordionMenuClassNames = {
  root: 'lg:ps-1 space-y-3',
  group: 'gap-px',
  label: 'uppercase text-xs font-medium text-muted-foreground/70 pt-2.25 pb-px',
  separator: '',
  item: 'h-8 hover:bg-transparent text-accent-foreground hover:text-primary data-[selected=true]:text-primary data-[selected=true]:bg-muted data-[selected=true]:font-medium',
  sub: '',
  subTrigger:
    'h-8 hover:bg-transparent text-accent-foreground hover:text-primary data-[selected=true]:text-primary data-[selected=true]:bg-muted data-[selected=true]:font-medium',
  subContent: 'py-0',
  indicator: '',
};

type Translate = (id: string) => string;

function buildMenuHeading(item: MenuItem, index: number, t: Translate): JSX.Element {
  return <AccordionMenuLabel key={index}>{t(item.heading || '')}</AccordionMenuLabel>;
}

function buildMenuItemRootDisabled(item: MenuItem, index: number, t: Translate): JSX.Element {
  return (
    <AccordionMenuItem key={index} value={`disabled-${index}`} className="text-sm font-medium">
      {item.icon && <item.icon data-slot="accordion-menu-icon" />}
      <span data-slot="accordion-menu-title">{t(item.title || '')}</span>
      {item.disabled && (
        <Badge variant="secondary" size="sm" className="ms-auto me-[-10px]">
          {t('Soon')}
        </Badge>
      )}
    </AccordionMenuItem>
  );
}

function buildMenuItemChildDisabled(
  item: MenuItem,
  index: number,
  level: number,
  t: Translate,
): JSX.Element {
  return (
    <AccordionMenuItem
      key={index}
      value={`disabled-child-${level}-${index}`}
      className="text-[13px]"
    >
      <span data-slot="accordion-menu-title">{t(item.title || '')}</span>
      {item.disabled && (
        <Badge variant="secondary" size="sm" className="ms-auto me-[-10px]">
          {t('Soon')}
        </Badge>
      )}
    </AccordionMenuItem>
  );
}

function buildMenuItemChild(
  item: MenuItem,
  index: number,
  level: number,
  t: Translate,
): JSX.Element {
  if (item.children) {
    return (
      <AccordionMenuSub key={index} value={item.path || `child-${level}-${index}`}>
        <AccordionMenuSubTrigger className="text-[13px]">
          {item.collapse ? (
            <span className="text-muted-foreground">
              <span className="hidden [[data-state=open]>span>&]:inline">
                {t(item.collapseTitle || '')}
              </span>
              <span className="inline [[data-state=open]>span>&]:hidden">
                {t(item.expandTitle || '')}
              </span>
            </span>
          ) : (
            t(item.title || '')
          )}
        </AccordionMenuSubTrigger>
        <AccordionMenuSubContent
          type="single"
          collapsible
          parentValue={item.path || `child-${level}-${index}`}
          className={cn('ps-4', !item.collapse && 'relative')}
        >
          <AccordionMenuGroup>
            {buildMenuItemChildren(item.children, t, item.collapse ? level : level + 1)}
          </AccordionMenuGroup>
        </AccordionMenuSubContent>
      </AccordionMenuSub>
    );
  }

  return (
    <AccordionMenuItem key={index} value={item.path || ''} className="text-[13px]">
      <Link to={item.path || '#'}>{t(item.title || '')}</Link>
    </AccordionMenuItem>
  );
}

function buildMenuItemChildren(items: MenuConfig, t: Translate, level: number = 0): JSX.Element[] {
  return items.map((item: MenuItem, index: number) => {
    if (item.disabled) {
      return buildMenuItemChildDisabled(item, index, level, t);
    }
    return buildMenuItemChild(item, index, level, t);
  });
}

function buildMenuItemRoot(item: MenuItem, index: number, t: Translate): JSX.Element {
  if (item.children) {
    return (
      <AccordionMenuSub key={index} value={item.path || `root-${index}`}>
        <AccordionMenuSubTrigger className="text-sm font-medium">
          {item.icon && <item.icon data-slot="accordion-menu-icon" />}
          <span data-slot="accordion-menu-title">{t(item.title || '')}</span>
        </AccordionMenuSubTrigger>
        <AccordionMenuSubContent
          type="single"
          collapsible
          parentValue={item.path || `root-${index}`}
          className="ps-6"
        >
          <AccordionMenuGroup>{buildMenuItemChildren(item.children, t, 1)}</AccordionMenuGroup>
        </AccordionMenuSubContent>
      </AccordionMenuSub>
    );
  }

  return (
    <AccordionMenuItem key={index} value={item.path || ''} className="text-sm font-medium">
      <Link to={item.path || '#'} className="flex items-center justify-between grow gap-2">
        {item.icon && <item.icon data-slot="accordion-menu-icon" />}
        <span data-slot="accordion-menu-title">{t(item.title || '')}</span>
      </Link>
    </AccordionMenuItem>
  );
}

function buildMenu(items: MenuConfig, t: Translate): JSX.Element[] {
  return items.map((item: MenuItem, index: number) => {
    if (item.heading) {
      return buildMenuHeading(item, index, t);
    }
    if (item.disabled) {
      return buildMenuItemRootDisabled(item, index, t);
    }
    return buildMenuItemRoot(item, index, t);
  });
}

function filterMenuByPermission(
  items: MenuConfig,
  hasPermission: (permission: NonNullable<MenuItem['permission']>) => boolean,
): MenuConfig {
  if (!isSupabaseConfigured) return items;

  return items
    .map((item) => {
      if (item.heading) return item;
      if (item.permission && !hasPermission(item.permission)) return null;
      if (item.children) {
        const children = filterMenuByPermission(item.children, hasPermission);
        if (!children.length) return null;
        return { ...item, children };
      }
      return item;
    })
    .filter(Boolean) as MenuConfig;
}

export function SidebarMenu() {
  const { pathname } = useLocation();
  const { hasPermission } = useAuth();
  const t = useT();

  const matchPath = useCallback(
    (path: string): boolean =>
      path === pathname ||
      (path.length > 1 && pathname.startsWith(path) && path !== '/store-inventory'),
    [pathname],
  );

  const menuItems = useMemo(
    () => buildMenu(filterMenuByPermission(MENU_SIDEBAR as MenuConfig, hasPermission), t),
    [hasPermission, t],
  );

  return (
    <ScrollArea className="flex grow shrink-0 py-5 px-5 lg:h-[calc(100vh-5.5rem)]">
      <AccordionMenu
        selectedValue={pathname}
        matchPath={matchPath}
        type="single"
        collapsible
        classNames={MENU_CLASS_NAMES}
      >
        {menuItems}
      </AccordionMenu>
    </ScrollArea>
  );
}

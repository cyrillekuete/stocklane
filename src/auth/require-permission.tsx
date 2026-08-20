import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './context/auth-context';
import { permissionForPath, type AppPermission } from './lib/roles';
import { isSupabaseConfigured } from '@/lib/supabase';
import { ScreenLoader } from '@/components/screen-loader';

type RequirePermissionProps = {
  permission?: AppPermission;
  /** When omitted, permission is inferred from the current path. */
  children?: never;
};

export function RequirePermission({ permission }: RequirePermissionProps) {
  const { hasPermission, loading, role } = useAuth();
  const location = useLocation();

  if (!isSupabaseConfigured) {
    return <Outlet />;
  }

  if (loading) {
    return <ScreenLoader />;
  }

  const required = permission ?? permissionForPath(location.pathname);
  if (!required || hasPermission(required)) {
    return <Outlet />;
  }

  if (!role) {
    return <Navigate to="/auth/signin" replace />;
  }

  // Send unauthorized users to the first area their role can open.
  const fallback =
    role === 'cashier'
      ? '/store-inventory/pos'
      : role === 'store_keeper'
        ? '/store-inventory/all-stock'
        : '/store-inventory/dashboard';

  return <Navigate to={fallback} replace />;
}

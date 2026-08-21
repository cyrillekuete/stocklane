import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './context/auth-context';
import {
  firstAllowedPath,
  permissionForPath,
  resolveUserPermissions,
  type AppPermission,
} from './lib/roles';
import { useT } from '@/i18n/use-t';
import { isSupabaseConfigured } from '@/lib/supabase';
import { ScreenLoader } from '@/components/screen-loader';

type RequirePermissionProps = {
  permission?: AppPermission;
  /** When omitted, permission is inferred from the current path. */
  children?: never;
};

export function RequirePermission({ permission }: RequirePermissionProps) {
  const t = useT();
  const { hasPermission, loading, role, user } = useAuth();
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

  const fallback = firstAllowedPath(resolveUserPermissions(role, user?.permissions));
  if (fallback && fallback !== location.pathname) {
    const fallbackPermission = permissionForPath(fallback);
    if (!fallbackPermission || hasPermission(fallbackPermission)) {
      return <Navigate to={fallback} replace />;
    }
  }

  return (
    <div className="container-fluid py-10">
      <div className="mx-auto max-w-lg rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        {t(
          'You do not have access to this area. Ask an Admin to update your permissions in User Management.',
        )}
      </div>
    </div>
  );
}

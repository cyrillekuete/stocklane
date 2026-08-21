import { useEffect, useMemo, useState } from 'react';
import {
  APP_PERMISSIONS,
  PERMISSION_DESCRIPTIONS,
  PERMISSION_LABELS,
  ROLE_LABELS,
  permissionsForRole,
  permissionsMatchRole,
  type AppPermission,
} from '@/auth/lib/roles';
import { useT } from '@/i18n/use-t';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useUpdateStaffUser } from '@/store-inventory/hooks/use-users';
import type { StaffUserRow } from '@/store-inventory/services/users';

type UserPermissionsDialogProps = {
  user: StaffUserRow | null;
  onClose: () => void;
};

export function UserPermissionsDialog({ user, onClose }: UserPermissionsDialogProps) {
  const t = useT();
  const updateUser = useUpdateStaffUser();
  const [selected, setSelected] = useState<AppPermission[]>([]);

  useEffect(() => {
    if (!user) return;
    setSelected(user.permissions);
  }, [user]);

  const isAdminRole = user?.role === 'admin';
  const usingRoleDefaults = useMemo(
    () => (user ? permissionsMatchRole(user.role, selected) : true),
    [selected, user],
  );

  const toggle = (permission: AppPermission, checked: boolean) => {
    if (isAdminRole || permission === 'users') return;
    setSelected((current) =>
      checked ? [...current, permission] : current.filter((item) => item !== permission),
    );
  };

  return (
    <Dialog open={Boolean(user)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('User permissions')}</DialogTitle>
          <DialogDescription>
            {user
              ? t(
                  'Choose which areas {name} can open. Role defaults for {role} can be restored at any time. The user may need to refresh or sign in again before changes take effect.',
                  {
                    name: user.fullName || user.email,
                    role: t(ROLE_LABELS[user.role]),
                  },
                )
              : null}
          </DialogDescription>
        </DialogHeader>
        {isAdminRole ? (
          <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {t("Admins always have full access. Change the user's role to customize module permissions.")}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {usingRoleDefaults
              ? t("Currently matching this role's default access.")
              : t('Custom access — different from the role defaults.')}
          </p>
        )}
        <div className="max-h-[min(60vh,28rem)] overflow-y-auto grid gap-3 py-1 pr-1">
          {APP_PERMISSIONS.map((permission) => {
            const locked = isAdminRole || permission === 'users';
            const checked = selected.includes(permission);
            return (
              <div
                key={permission}
                className="flex items-start justify-between gap-4 rounded-md border px-3 py-2.5"
              >
                <div className="min-w-0 space-y-0.5">
                  <Label htmlFor={`perm-${permission}`} className="text-sm font-medium">
                    {t(PERMISSION_LABELS[permission])}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t(PERMISSION_DESCRIPTIONS[permission])}
                  </p>
                </div>
                <Switch
                  id={`perm-${permission}`}
                  size="sm"
                  checked={checked}
                  disabled={locked}
                  onCheckedChange={(value) => toggle(permission, value)}
                />
              </div>
            );
          })}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={!user || isAdminRole}
            onClick={() => user && setSelected(permissionsForRole(user.role))}
          >
            {t('Reset to role defaults')}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button
              disabled={!user || updateUser.isPending || isAdminRole}
              onClick={() => {
                if (!user) return;
                updateUser.mutate(
                  { id: user.id, permissions: selected },
                  { onSuccess: onClose },
                );
              }}
            >
              {t('Save permissions')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

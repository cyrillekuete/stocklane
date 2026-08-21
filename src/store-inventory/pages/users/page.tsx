import { useMemo, useState } from 'react';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { EllipsisVertical, Plus, Search, Shield, X } from 'lucide-react';
import { useAuth } from '@/auth';
import { APP_ROLES, ROLE_LABELS, type AppRole } from '@/auth/lib/roles';
import type { UserStatus } from '@/auth/lib/models';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardFooter,
  CardHeader,
  CardHeading,
  CardTable,
  CardToolbar,
} from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateStaffUser,
  useDeleteStaffUser,
  useSetStaffPassword,
  useStaffUsers,
  useUpdateStaffUser,
} from '@/store-inventory/hooks/use-users';
import type { StaffUserRow } from '@/store-inventory/services/users';

function statusVariant(status: UserStatus) {
  if (status === 'active') return 'success' as const;
  if (status === 'invited') return 'warning' as const;
  return 'secondary' as const;
}

function roleVariant(role: AppRole) {
  if (role === 'admin') return 'destructive' as const;
  if (role === 'cashier') return 'info' as const;
  return 'primary' as const;
}

export function UsersPage() {
  const { user: currentUser, isAdmin } = useAuth();
  const { data = [], isLoading } = useStaffUsers();
  const createUser = useCreateStaffUser();
  const updateUser = useUpdateStaffUser();
  const setPassword = useSetStaffPassword();
  const deleteUser = useDeleteStaffUser();

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<StaffUserRow | null>(null);
  const [passwordUser, setPasswordUser] = useState<StaffUserRow | null>(null);

  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'cashier' as AppRole,
  });
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    role: 'cashier' as AppRole,
    status: 'active' as UserStatus,
  });
  const [newPassword, setNewPassword] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((row) => {
      if (roleFilter !== 'all' && row.role !== roleFilter) return false;
      if (!q) return true;
      return (
        row.email.toLowerCase().includes(q) ||
        row.fullName.toLowerCase().includes(q) ||
        row.firstName.toLowerCase().includes(q) ||
        row.lastName.toLowerCase().includes(q) ||
        ROLE_LABELS[row.role].toLowerCase().includes(q)
      );
    });
  }, [data, query, roleFilter]);

  const columns = useMemo<ColumnDef<StaffUserRow>[]>(
    () => [
      {
        accessorKey: 'fullName',
        id: 'member',
        header: ({ column }) => <DataGridColumnHeader title="Member" column={column} />,
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5 py-1">
            <span className="text-sm font-medium text-foreground">
              {row.original.fullName || `${row.original.firstName} ${row.original.lastName}`.trim() || '—'}
            </span>
            <span className="text-xs text-muted-foreground">{row.original.email}</span>
          </div>
        ),
        size: 260,
      },
      {
        accessorKey: 'role',
        header: ({ column }) => <DataGridColumnHeader title="Role" column={column} />,
        cell: ({ row }) => (
          <Badge variant={roleVariant(row.original.role)} appearance="light">
            {ROLE_LABELS[row.original.role]}
          </Badge>
        ),
        size: 140,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataGridColumnHeader title="Status" column={column} />,
        cell: ({ row }) => (
          <Badge variant={statusVariant(row.original.status)} appearance="light">
            {row.original.status}
          </Badge>
        ),
        size: 120,
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataGridColumnHeader title="Created" column={column} />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.createdAt
              ? new Date(row.original.createdAt).toLocaleDateString()
              : '—'}
          </span>
        ),
        size: 120,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const item = row.original;
          const isSelf = currentUser?.id === item.id;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" mode="icon" size="sm">
                  <EllipsisVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setEditUser(item);
                    setEditForm({
                      firstName: item.firstName,
                      lastName: item.lastName,
                      role: item.role,
                      status: item.status,
                    });
                  }}
                >
                  Edit details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPasswordUser(item)}>
                  Reset password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={isSelf}
                  onClick={() => {
                    if (isSelf) return;
                    if (window.confirm(`Delete ${item.email}? This cannot be undone.`)) {
                      deleteUser.mutate(item.id);
                    }
                  }}
                  className="text-destructive"
                >
                  Delete user
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        size: 60,
      },
    ],
    [currentUser?.id, deleteUser],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!isAdmin) {
    return (
      <div className="container-fluid">
        <Card>
          <CardHeader>
            <CardHeading>User Management</CardHeading>
          </CardHeader>
          <div className="p-6 text-sm text-muted-foreground">
            Only Admins can manage staff users.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="container-fluid">
        <DataGrid
          table={table}
          recordCount={filtered.length}
          isLoading={isLoading}
          tableLayout={{ cellBorder: true, rowBorder: true, headerSticky: true }}
        >
          <Card>
            <CardHeader>
              <CardHeading className="flex items-center gap-2">
                <Shield className="size-4" />
                Users
              </CardHeading>
              <CardToolbar>
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative">
                    <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search users"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="ps-9 w-56"
                    />
                    {query && (
                      <Button
                        variant="ghost"
                        mode="icon"
                        size="sm"
                        className="absolute end-1 top-1/2 -translate-y-1/2"
                        onClick={() => setQuery('')}
                      >
                        <X />
                      </Button>
                    )}
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All roles</SelectItem>
                      {APP_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => {
                      setForm({
                        email: '',
                        password: '',
                        firstName: '',
                        lastName: '',
                        role: 'cashier',
                      });
                      setCreateOpen(true);
                    }}
                  >
                    <Plus />
                    Add user
                  </Button>
                </div>
              </CardToolbar>
            </CardHeader>
            <CardTable>
              <ScrollArea>
                <DataGridTable />
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardTable>
            <CardFooter>
              <DataGridPagination />
            </CardFooter>
          </Card>
        </DataGrid>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add staff user</DialogTitle>
            <DialogDescription>
              Creates a Supabase Auth user with one of the three store roles.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First name</Label>
                <Input
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Last name</Label>
                <Input
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Temporary password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(value) => setForm((f) => ({ ...f, role: value as AppRole }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APP_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={createUser.isPending}
              onClick={() => {
                createUser.mutate(
                  {
                    email: form.email,
                    password: form.password,
                    role: form.role,
                    firstName: form.firstName,
                    lastName: form.lastName,
                  },
                  { onSuccess: () => setCreateOpen(false) },
                );
              }}
            >
              Create user
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editUser)} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>{editUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First name</Label>
                <Input
                  value={editForm.firstName}
                  onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Last name</Label>
                <Input
                  value={editForm.lastName}
                  onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(value) => setEditForm((f) => ({ ...f, role: value as AppRole }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APP_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) =>
                  setEditForm((f) => ({ ...f, status: value as UserStatus }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="invited">Invited</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Cancel
            </Button>
            <Button
              disabled={!editUser || updateUser.isPending}
              onClick={() => {
                if (!editUser) return;
                updateUser.mutate(
                  {
                    id: editUser.id,
                    firstName: editForm.firstName,
                    lastName: editForm.lastName,
                    role: editForm.role,
                    status: editForm.status,
                  },
                  { onSuccess: () => setEditUser(null) },
                );
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(passwordUser)}
        onOpenChange={(open) => !open && setPasswordUser(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>{passwordUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>New password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordUser(null)}>
              Cancel
            </Button>
            <Button
              disabled={!passwordUser || setPassword.isPending}
              onClick={() => {
                if (!passwordUser) return;
                setPassword.mutate(
                  { userId: passwordUser.id, password: newPassword },
                  {
                    onSuccess: () => {
                      setPasswordUser(null);
                      setNewPassword('');
                    },
                  },
                );
              }}
            >
              Update password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { supabase } from '@/lib/supabase';
import type { AppRole } from '@/auth/lib/roles';
import type { UserStatus } from '@/auth/lib/models';

export type StaffUserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: AppRole;
  status: UserStatus;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateStaffUserInput = {
  email: string;
  password: string;
  role: AppRole;
  firstName?: string;
  lastName?: string;
};

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

function mapRow(row: Record<string, unknown>): StaffUserRow {
  return {
    id: String(row.id),
    email: String(row.email ?? ''),
    firstName: String(row.first_name ?? ''),
    lastName: String(row.last_name ?? ''),
    fullName: String(row.full_name ?? ''),
    role: row.role as AppRole,
    status: row.status as UserStatus,
    avatarUrl: (row.avatar_url as string | null) ?? null,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  };
}

export async function fetchStaffUsers(): Promise<StaffUserRow[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function updateStaffUser(
  id: string,
  input: {
    role?: AppRole;
    status?: UserStatus;
    firstName?: string;
    lastName?: string;
  },
): Promise<StaffUserRow> {
  const client = requireClient();
  const { data, error } = await client.rpc('inventory_admin_update_user', {
    p_user_id: id,
    p_role: input.role ?? null,
    p_status: input.status ?? null,
    p_first_name: input.firstName ?? null,
    p_last_name: input.lastName ?? null,
  });
  if (error) throw new Error(error.message);
  return mapRow(data as Record<string, unknown>);
}

async function invokeManageUsers(body: Record<string, unknown>) {
  const client = requireClient();
  const { data, error } = await client.functions.invoke('manage-users', { body });
  if (error) {
    throw new Error(
      error.message.includes('Failed to send') || error.message.includes('not found')
        ? 'User management API is not deployed yet. Run `supabase functions deploy manage-users`, or create users with `npm run seed:auth-users`.'
        : error.message,
    );
  }
  if (data?.error) throw new Error(String(data.error));
  return data;
}

export async function createStaffUser(input: CreateStaffUserInput) {
  return invokeManageUsers({
    action: 'create',
    email: input.email,
    password: input.password,
    role: input.role,
    first_name: input.firstName ?? '',
    last_name: input.lastName ?? '',
  });
}

export async function setStaffUserPassword(userId: string, password: string) {
  return invokeManageUsers({
    action: 'set_password',
    user_id: userId,
    password,
  });
}

export async function deleteStaffUser(userId: string) {
  return invokeManageUsers({
    action: 'delete',
    user_id: userId,
  });
}

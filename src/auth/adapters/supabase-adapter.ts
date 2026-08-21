import { supabase } from '@/lib/supabase';
import type { AuthModel, UserModel, UserStatus } from '@/auth/lib/models';
import { normalizeRole, resolveUserPermissions, type AppRole } from '@/auth/lib/roles';

function requireClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
}

function mapProfileRow(
  user: { id: string; email?: string | null; email_confirmed_at?: string | null; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> },
  profile?: {
    first_name?: string | null;
    last_name?: string | null;
    full_name?: string | null;
    role?: string | null;
    status?: string | null;
    permissions?: unknown;
    avatar_url?: string | null;
  } | null,
): UserModel {
  const metadata = user.user_metadata ?? {};
  const appMeta = user.app_metadata ?? {};

  const role =
    normalizeRole(profile?.role) ??
    normalizeRole(appMeta.role) ??
    ('cashier' as AppRole);

  const firstName =
    profile?.first_name ??
    (typeof metadata.first_name === 'string' ? metadata.first_name : '') ??
    '';
  const lastName =
    profile?.last_name ??
    (typeof metadata.last_name === 'string' ? metadata.last_name : '') ??
    '';
  const fullname =
    profile?.full_name ??
    (typeof metadata.fullname === 'string' ? metadata.fullname : '') ??
    `${firstName} ${lastName}`.trim();

  const status = (profile?.status as UserStatus | undefined) ?? 'active';

  return {
    id: user.id,
    email: user.email ?? '',
    email_verified: Boolean(user.email_confirmed_at),
    username:
      typeof metadata.username === 'string'
        ? metadata.username
        : (user.email?.split('@')[0] ?? ''),
    first_name: firstName,
    last_name: lastName,
    fullname,
    phone: typeof metadata.phone === 'string' ? metadata.phone : '',
    pic: profile?.avatar_url ?? (typeof metadata.pic === 'string' ? metadata.pic : ''),
    language: 'en',
    role,
    status,
    permissions: resolveUserPermissions(role, profile?.permissions ?? appMeta.permissions),
    is_admin: role === 'admin',
  };
}

export const SupabaseAdapter = {
  async login(email: string, password: string): Promise<AuthModel> {
    const client = requireClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (!data.session) throw new Error('No session returned after login.');

    const profile = await this.getCurrentUser();
    if (profile?.status === 'inactive') {
      await client.auth.signOut();
      throw new Error('Your account is inactive. Contact an administrator.');
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    };
  },

  async register(
    email: string,
    password: string,
    password_confirmation: string,
    firstName?: string,
    lastName?: string,
  ): Promise<AuthModel> {
    if (password !== password_confirmation) {
      throw new Error('Passwords do not match');
    }
    const client = requireClient();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: email.split('@')[0],
          first_name: firstName || '',
          last_name: lastName || '',
          fullname: firstName && lastName ? `${firstName} ${lastName}`.trim() : '',
        },
        // New self-signups get cashier until an admin promotes them.
        // Role is enforced via inventory_profiles + app_metadata (not user_metadata).
      },
    });
    if (error) throw new Error(error.message);
    if (!data.session) {
      return { access_token: '', refresh_token: '' };
    }
    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    };
  },

  async requestPasswordReset(email: string): Promise<void> {
    const client = requireClient();
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/change-password`,
    });
    if (error) throw new Error(error.message);
  },

  async resetPassword(password: string, password_confirmation: string): Promise<void> {
    if (password !== password_confirmation) {
      throw new Error('Passwords do not match');
    }
    const client = requireClient();
    const { error } = await client.auth.updateUser({ password });
    if (error) throw new Error(error.message);
  },

  async resendVerificationEmail(email: string): Promise<void> {
    const client = requireClient();
    const { error } = await client.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/signin`,
      },
    });
    if (error) throw new Error(error.message);
  },

  async getCurrentUser(): Promise<UserModel | null> {
    const client = requireClient();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) return null;

    const { data: profile } = await client
      .from('inventory_profiles')
      .select('first_name, last_name, full_name, role, status, permissions, avatar_url')
      .eq('id', data.user.id)
      .maybeSingle();

    return mapProfileRow(data.user, profile);
  },

  async updateUserProfile(userData: Partial<UserModel>): Promise<UserModel> {
    const client = requireClient();
    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();
    if (userError || !user) throw new Error(userError?.message || 'User not found');

    const metadata: Record<string, unknown> = {
      username: userData.username,
      first_name: userData.first_name,
      last_name: userData.last_name,
      fullname:
        userData.fullname ||
        `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
      phone: userData.phone,
      pic: userData.pic,
      language: userData.language,
      updated_at: new Date().toISOString(),
    };
    Object.keys(metadata).forEach((key) => {
      if (metadata[key] === undefined) delete metadata[key];
    });

    const { error } = await client.auth.updateUser({ data: metadata });
    if (error) throw new Error(error.message);

    // Keep profile display fields in sync (role stays admin-managed).
    const profilePatch: Record<string, unknown> = {
      first_name: userData.first_name,
      last_name: userData.last_name,
      full_name:
        userData.fullname ||
        `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
      avatar_url: userData.pic,
      updated_at: new Date().toISOString(),
    };
    Object.keys(profilePatch).forEach((key) => {
      if (profilePatch[key] === undefined) delete profilePatch[key];
    });
    if (Object.keys(profilePatch).length > 1) {
      await client.from('inventory_profiles').update(profilePatch).eq('id', user.id);
    }

    const current = await this.getCurrentUser();
    if (!current) throw new Error('Failed to reload profile');
    return current;
  },

  async logout(): Promise<void> {
    const client = requireClient();
    const { error } = await client.auth.signOut();
    if (error) throw new Error(error.message);
  },
};

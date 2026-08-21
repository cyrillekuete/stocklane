import { PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { SupabaseAdapter } from '@/auth/adapters/supabase-adapter';
import { AuthContext } from '@/auth/context/auth-context';
import * as authHelper from '@/auth/lib/helpers';
import type { AuthModel, UserModel } from '@/auth/lib/models';
import { hasAppPermission, type AppPermission, type AppRole } from '@/auth/lib/roles';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export function AuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<AuthModel | undefined>(authHelper.getAuth());
  const [currentUser, setCurrentUser] = useState<UserModel | undefined>();

  const role: AppRole | null = currentUser?.role ?? null;
  const isAdmin = role === 'admin';

  const saveAuth = useCallback((next: AuthModel | undefined) => {
    setAuth(next);
    if (next) authHelper.setAuth(next);
    else authHelper.removeAuth();
  }, []);

  const getUser = useCallback(async () => {
    if (!isSupabaseConfigured) return null;
    return SupabaseAdapter.getCurrentUser();
  }, []);

  const verify = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      saveAuth(undefined);
      setCurrentUser(undefined);
      return;
    }
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        saveAuth(undefined);
        setCurrentUser(undefined);
        return;
      }
      saveAuth({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
      const user = await getUser();
      setCurrentUser(user || undefined);
    } catch {
      saveAuth(undefined);
      setCurrentUser(undefined);
    }
  }, [getUser, saveAuth]);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      try {
        await verify();
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void boot();

    if (!supabase) return () => {
      mounted = false;
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (session) {
        saveAuth({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          const user = await getUser();
          if (mounted) setCurrentUser(user || undefined);
        }
      } else if (event === 'SIGNED_OUT') {
        saveAuth(undefined);
        setCurrentUser(undefined);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [getUser, saveAuth, verify]);

  const login = async (email: string, password: string) => {
    const nextAuth = await SupabaseAdapter.login(email, password);
    saveAuth(nextAuth);
    const user = await getUser();
    setCurrentUser(user || undefined);
  };

  const register = async (
    email: string,
    password: string,
    password_confirmation: string,
    firstName?: string,
    lastName?: string,
  ) => {
    const nextAuth = await SupabaseAdapter.register(
      email,
      password,
      password_confirmation,
      firstName,
      lastName,
    );
    saveAuth(nextAuth.access_token ? nextAuth : undefined);
    const user = nextAuth.access_token ? await getUser() : null;
    setCurrentUser(user || undefined);
  };

  const requestPasswordReset = async (email: string) => {
    await SupabaseAdapter.requestPasswordReset(email);
  };

  const resetPassword = async (password: string, password_confirmation: string) => {
    await SupabaseAdapter.resetPassword(password, password_confirmation);
  };

  const resendVerificationEmail = async (email: string) => {
    await SupabaseAdapter.resendVerificationEmail(email);
  };

  const updateProfile = async (userData: Partial<UserModel>) => {
    const updated = await SupabaseAdapter.updateUserProfile(userData);
    setCurrentUser(updated);
    return updated;
  };

  const logout = async () => {
    try {
      await SupabaseAdapter.logout();
    } finally {
      saveAuth(undefined);
      setCurrentUser(undefined);
    }
  };

  const hasPermission = useCallback(
    (permission: AppPermission) => hasAppPermission(role, currentUser?.permissions, permission),
    [currentUser?.permissions, role],
  );

  const value = useMemo(
    () => ({
      loading,
      setLoading,
      auth,
      saveAuth,
      user: currentUser,
      setUser: setCurrentUser,
      login,
      register,
      requestPasswordReset,
      resetPassword,
      resendVerificationEmail,
      getUser,
      updateProfile,
      logout,
      verify,
      isAdmin,
      role,
      hasPermission,
    }),
    [
      loading,
      auth,
      saveAuth,
      currentUser,
      getUser,
      verify,
      isAdmin,
      role,
      hasPermission,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

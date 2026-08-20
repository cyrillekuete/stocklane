import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ScreenLoader } from '@/components/screen-loader';
import { useAuth } from './context/auth-context';
import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * Protects routes that require authentication.
 * When Supabase is not configured, allows access (local demo mode).
 */
export function RequireAuth() {
  const { auth, verify, loading: globalLoading } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const verificationStarted = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const checkAuth = async () => {
      if (verificationStarted.current) {
        setLoading(false);
        return;
      }
      verificationStarted.current = true;
      try {
        await verify();
      } finally {
        setLoading(false);
      }
    };

    void checkAuth();
  }, [verify]);

  if (!isSupabaseConfigured) {
    return <Outlet />;
  }

  if (loading || globalLoading) {
    return <ScreenLoader />;
  }

  if (!auth?.access_token) {
    return (
      <Navigate
        to={`/auth/signin?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }

  return <Outlet />;
}

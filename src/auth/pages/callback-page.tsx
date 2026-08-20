import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ScreenLoader } from '@/components/screen-loader';

export function CallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { saveAuth } = useAuth();

  useEffect(() => {
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (errorParam) {
      setError(errorDescription || 'Authentication failed');
      setTimeout(() => {
        navigate(
          `/auth/signin?error=${errorParam}&error_description=${encodeURIComponent(errorDescription || 'Authentication failed')}`,
        );
      }, 1500);
      return;
    }

    const handleCallback = async () => {
      try {
        if (!supabase) throw new Error('Supabase is not configured');
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!data.session) throw new Error('Authentication session not established');

        saveAuth({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        const nextPath = searchParams.get('next') || '/store-inventory';
        navigate(nextPath);
      } catch {
        setError('An unexpected error occurred during authentication');
        setTimeout(() => {
          navigate(
            '/auth/signin?error=auth_callback_error&error_description=Failed to complete authentication',
          );
        }, 1500);
      }
    };

    void handleCallback();
  }, [navigate, searchParams, saveAuth]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h2 className="text-xl font-semibold text-destructive">Authentication Error</h2>
        <p className="text-muted-foreground">{error}</p>
        <p className="text-sm">Redirecting to sign-in page...</p>
      </div>
    );
  }

  return <ScreenLoader />;
}

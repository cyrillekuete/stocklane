import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Check, Eye, EyeOff, LoaderCircleIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  getNewPasswordSchema,
  type NewPasswordSchemaType,
} from '../forms/reset-password-schema';

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setTokenValid(true);
        setSuccessMessage('You can now set your new password');
      }
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const form = useForm<NewPasswordSchemaType>({
    resolver: zodResolver(getNewPasswordSchema()),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: NewPasswordSchemaType) {
    try {
      setIsProcessing(true);
      setError(null);
      await resetPassword(values.password, values.confirmPassword);
      setSuccessMessage('Password updated successfully.');
      setTimeout(() => navigate('/auth/signin?pwd_reset=success'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Set New Password</h1>
          <p className="text-sm text-muted-foreground">
            {tokenValid
              ? 'Choose a strong password for your account.'
              : 'Open this page from your password reset email link.'}
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertIcon>
              <AlertCircle className="h-4 w-4" />
            </AlertIcon>
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}

        {successMessage && (
          <Alert>
            <AlertIcon>
              <Check className="h-4 w-4" />
            </AlertIcon>
            <AlertTitle>{successMessage}</AlertTitle>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    type={passwordVisible ? 'text' : 'password'}
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="ghost"
                  mode="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setPasswordVisible((v) => !v)}
                >
                  {passwordVisible ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm password</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    type={confirmPasswordVisible ? 'text' : 'password'}
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="ghost"
                  mode="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setConfirmPasswordVisible((v) => !v)}
                >
                  {confirmPasswordVisible ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isProcessing}>
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <LoaderCircleIcon className="h-4 w-4 animate-spin" /> Saving...
            </span>
          ) : (
            'Update Password'
          )}
        </Button>

        <div className="text-center text-sm">
          <Link to="/auth/signin" className="font-semibold hover:text-primary">
            Back to Sign In
          </Link>
        </div>
      </form>
    </Form>
  );
}

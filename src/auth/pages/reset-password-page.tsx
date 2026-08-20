import { useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Check, LoaderCircleIcon, MoveLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
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
  getResetRequestSchema,
  type ResetRequestSchemaType,
} from '../forms/reset-password-schema';

export function ResetPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<ResetRequestSchemaType>({
    resolver: zodResolver(getResetRequestSchema()),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: ResetRequestSchemaType) {
    try {
      setIsProcessing(true);
      setError(null);
      await requestPasswordReset(values.email);
      setSuccessMessage(
        `Password reset link sent to ${values.email}. Check your inbox and spam folder.`,
      );
      form.reset();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred. Please try again.',
      );
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Reset Password</h1>
            <p className="text-sm text-muted-foreground">
              Enter your email to receive a password reset link
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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="Your email" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isProcessing}>
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <LoaderCircleIcon className="h-4 w-4 animate-spin" /> Sending...
              </span>
            ) : (
              'Send Reset Link'
            )}
          </Button>

          <div className="text-center">
            <Link
              to="/auth/signin"
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary"
            >
              <MoveLeft className="size-4" />
              Back to Sign In
            </Link>
          </div>
        </form>
      </Form>
    </div>
  );
}

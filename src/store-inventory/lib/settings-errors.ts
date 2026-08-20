import { formatZodSettingsError } from './settings-validation';

type PostgrestLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function asPostgrestError(error: unknown): PostgrestLikeError | null {
  if (!error || typeof error !== 'object') return null;
  return error as PostgrestLikeError;
}

/** Map Supabase/Postgres settings errors to actionable user messages. */
export function mapSettingsError(error: unknown, fallback = 'Unable to save settings'): Error {
  if (error instanceof Error && error.name === 'ZodError') {
    return new Error(formatZodSettingsError(error));
  }

  if (error instanceof Error && !('code' in error)) {
    return error;
  }

  const pg = asPostgrestError(error);
  const message = (pg?.message ?? (error instanceof Error ? error.message : '')).toLowerCase();
  const code = pg?.code ?? '';

  if (code === '23505' || message.includes('duplicate') || message.includes('unique')) {
    if (message.includes('store_code')) {
      return new Error('Store code must be unique');
    }
    return new Error('A settings conflict occurred. Refresh and try again.');
  }

  if (code === '23514' || message.includes('check constraint')) {
    if (message.includes('tax_percent')) {
      return new Error('Tax percent must be between 0 and 100');
    }
    if (message.includes('currency')) {
      return new Error('Currency must be XAF');
    }
    if (message.includes('store_name')) {
      return new Error('Store name is required');
    }
    if (message.includes('session_timeout')) {
      return new Error('Session timeout must be between 5 and 1440 minutes');
    }
    if (message.includes('password_min_length')) {
      return new Error('Password minimum length must be between 6 and 128');
    }
    return new Error('Settings values are outside the allowed range');
  }

  if (message.includes('tax percent')) {
    return new Error('Tax percent must be between 0 and 100');
  }
  if (message.includes('logo is too large')) {
    return new Error('Logo is too large (max ~500KB)');
  }
  if (message.includes('store name is required')) {
    return new Error('Store name is required');
  }

  if (pg?.message) {
    return new Error(pg.message);
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(fallback);
}

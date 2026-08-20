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

/** Map Supabase/Postgres customer errors to actionable user messages. */
export function mapCustomerError(error: unknown, fallback = 'Unable to update customer'): Error {
  if (error instanceof Error && !('code' in error)) {
    const message = error.message.toLowerCase();
    if (
      message.includes('settle the account') ||
      message.includes('archived') ||
      message.includes('must be active') ||
      message.includes('permanently deleting') ||
      message.includes('soft-delete') ||
      message.includes('duplicate') ||
      message.includes('already exists')
    ) {
      return error;
    }
  }

  const pg = asPostgrestError(error);
  const message = (pg?.message ?? (error instanceof Error ? error.message : '')).toLowerCase();
  const code = pg?.code ?? '';

  if (code === '23505' || message.includes('duplicate') || message.includes('unique')) {
    if (message.includes('email')) {
      return new Error('A customer with this email already exists');
    }
    return new Error('A customer with this code already exists');
  }

  if (message.includes('settle the account balance')) {
    return new Error('Settle the account balance before archiving this customer');
  }

  if (message.includes('sales, orders, or ledger') || message.includes('cannot be permanently deleted')) {
    return new Error('This customer has history and cannot be permanently deleted. Keep them archived.');
  }

  if (message.includes('soft-delete the customer')) {
    return new Error('Archive the customer before permanently deleting it');
  }

  if (message.includes('archived and cannot')) {
    return new Error('This customer is archived');
  }

  if (message.includes('must be active')) {
    return new Error('Customer must be Active for this action');
  }

  if (
    code === '23503' ||
    message.includes('foreign key') ||
    message.includes('violates foreign key')
  ) {
    return new Error('This customer is linked to sales or orders and cannot be deleted');
  }

  if (pg?.message) {
    return new Error(pg.message);
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(fallback);
}

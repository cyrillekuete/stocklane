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

/** Map Supabase/Postgres warehouse errors to actionable user messages. */
export function mapWarehouseError(error: unknown, fallback = 'Unable to update warehouse'): Error {
  if (error instanceof Error && !('code' in error)) {
    return error;
  }

  const pg = asPostgrestError(error);
  const message = (pg?.message ?? (error instanceof Error ? error.message : '')).toLowerCase();
  const code = pg?.code ?? '';

  if (code === '23505' || message.includes('duplicate') || message.includes('unique')) {
    if (message.includes('is_default') || message.includes('inventory_warehouses_one_default')) {
      return new Error('Only one default warehouse is allowed. Refresh and try again.');
    }
    return new Error('A warehouse with this code already exists');
  }

  if (
    code === '23503' ||
    message.includes('foreign key') ||
    message.includes('violates foreign key') ||
    message.includes('restrict')
  ) {
    return new Error('This warehouse has POS sales history and cannot be deleted');
  }

  if (pg?.message) {
    return new Error(pg.message);
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(fallback);
}

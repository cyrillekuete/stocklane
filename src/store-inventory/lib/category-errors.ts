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

/** Map Supabase/Postgres category errors to actionable user messages. */
export function mapCategoryError(error: unknown, fallback = 'Unable to update category'): Error {
  if (error instanceof Error && !('code' in error)) {
    return error;
  }

  const pg = asPostgrestError(error);
  const message = (pg?.message ?? (error instanceof Error ? error.message : '')).toLowerCase();
  const code = pg?.code ?? '';

  if (code === '23505' || message.includes('duplicate') || message.includes('unique')) {
    if (message.includes('name') || message.includes('name_lower')) {
      return new Error('A category with this name already exists');
    }
    if (message.includes('code')) {
      return new Error('A category with this code already exists. Try a different name.');
    }
    return new Error('A category with this name or code already exists');
  }

  if (code === '23514' || message.includes('status_check') || message.includes('check constraint')) {
    return new Error('Choose a valid status: Active, Inactive, Draft, or Archived');
  }

  if (pg?.message) {
    return new Error(pg.message);
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(fallback);
}

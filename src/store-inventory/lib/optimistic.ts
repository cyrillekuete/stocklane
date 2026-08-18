import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';

export type QuerySnapshot = [QueryKey, unknown][];

type Identifiable = { id: string };

export async function snapshotQueries(queryClient: QueryClient, ...queryKeys: QueryKey[]): Promise<QuerySnapshot> {
  const snapshot: QuerySnapshot = [];
  for (const queryKey of queryKeys) {
    await queryClient.cancelQueries({ queryKey });
    snapshot.push(...queryClient.getQueriesData({ queryKey }));
  }
  return snapshot;
}

export function restoreQueries(queryClient: QueryClient, snapshot: QuerySnapshot) {
  for (const [queryKey, data] of snapshot) {
    queryClient.setQueryData(queryKey, data);
  }
}

export function invalidateKeys(queryClient: QueryClient, ...queryKeys: QueryKey[]) {
  return Promise.all(queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

export function patchListById<T extends Identifiable>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  id: string,
  patch: Partial<T> | ((item: T) => T),
) {
  queryClient.setQueryData<T[]>(queryKey, (current) => {
    if (!current) return current;
    return current.map((item) => {
      if (item.id !== id) return item;
      return typeof patch === 'function' ? patch(item) : { ...item, ...patch };
    });
  });
}

export function patchListByIds<T extends Identifiable>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  ids: string[],
  patch: Partial<T> | ((item: T) => T),
) {
  const idSet = new Set(ids);
  queryClient.setQueryData<T[]>(queryKey, (current) => {
    if (!current) return current;
    return current.map((item) => {
      if (!idSet.has(item.id)) return item;
      return typeof patch === 'function' ? patch(item) : { ...item, ...patch };
    });
  });
}

export function removeFromList<T extends Identifiable>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  ids: string | string[],
) {
  const idSet = new Set(Array.isArray(ids) ? ids : [ids]);
  queryClient.setQueryData<T[]>(queryKey, (current) => current?.filter((item) => !idSet.has(item.id)));
}

export function prependToList<T>(queryClient: QueryClient, queryKey: QueryKey, row: T) {
  queryClient.setQueryData<T[]>(queryKey, (current) => (current ? [row, ...current] : [row]));
}

export function replaceListItemId<T extends Identifiable>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  tempId: string,
  nextId: string,
) {
  if (!nextId || tempId === nextId) return;
  queryClient.setQueryData<T[]>(queryKey, (current) =>
    current?.map((item) => (item.id === tempId ? { ...item, id: nextId } : item)),
  );
}

export function patchQueryData<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  patch: Partial<T> | ((item: T) => T),
) {
  queryClient.setQueryData<T>(queryKey, (current) => {
    if (!current) return current;
    return typeof patch === 'function' ? patch(current) : { ...current, ...patch };
  });
}

export function toastMutationError(error: unknown, fallback = 'Something went wrong. Changes were reverted.') {
  toast.error(error instanceof Error ? error.message : fallback);
}

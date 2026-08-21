import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useT } from '@/i18n/use-t';
import { isSupabaseConfigured } from '@/lib/supabase';
import { inventoryKeys } from '../lib/query-keys';
import {
  createStaffUser,
  deleteStaffUser,
  fetchStaffUsers,
  setStaffUserPassword,
  updateStaffUser,
  type CreateStaffUserInput,
  type UpdateStaffUserInput,
} from '../services/users';

export function useStaffUsers() {
  return useQuery({
    queryKey: inventoryKeys.users(),
    queryFn: fetchStaffUsers,
    enabled: isSupabaseConfigured,
  });
}

export function useCreateStaffUser() {
  const t = useT();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStaffUserInput) => createStaffUser(input),
    onSuccess: () => {
      toast.success(t('User created'));
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.users() });
    },
    onError: (error: Error) => toast.error(t(error.message)),
  });
}

export function useUpdateStaffUser() {
  const t = useT();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & UpdateStaffUserInput) =>
      updateStaffUser(id, input),
    onSuccess: (_data, variables) => {
      toast.success(
        t(variables.permissions && !variables.role ? 'Permissions updated' : 'User updated'),
      );
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.users() });
    },
    onError: (error: Error) => toast.error(t(error.message)),
  });
}

export function useSetStaffPassword() {
  const t = useT();
  return useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      setStaffUserPassword(userId, password),
    onSuccess: () => toast.success(t('Password updated')),
    onError: (error: Error) => toast.error(t(error.message)),
  });
}

export function useDeleteStaffUser() {
  const t = useT();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => deleteStaffUser(userId),
    onSuccess: () => {
      toast.success(t('User deleted'));
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.users() });
    },
    onError: (error: Error) => toast.error(t(error.message)),
  });
}

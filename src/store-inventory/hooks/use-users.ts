import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { isSupabaseConfigured } from '@/lib/supabase';
import { inventoryKeys } from '../lib/query-keys';
import {
  createStaffUser,
  deleteStaffUser,
  fetchStaffUsers,
  setStaffUserPassword,
  updateStaffUser,
  type CreateStaffUserInput,
} from '../services/users';
import type { AppRole } from '@/auth/lib/roles';
import type { UserStatus } from '@/auth/lib/models';

export function useStaffUsers() {
  return useQuery({
    queryKey: inventoryKeys.users(),
    queryFn: fetchStaffUsers,
    enabled: isSupabaseConfigured,
  });
}

export function useCreateStaffUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStaffUserInput) => createStaffUser(input),
    onSuccess: () => {
      toast.success('User created');
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.users() });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateStaffUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: {
      id: string;
      role?: AppRole;
      status?: UserStatus;
      firstName?: string;
      lastName?: string;
    }) => updateStaffUser(id, input),
    onSuccess: () => {
      toast.success('User updated');
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.users() });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useSetStaffPassword() {
  return useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      setStaffUserPassword(userId, password),
    onSuccess: () => toast.success('Password updated'),
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteStaffUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => deleteStaffUser(userId),
    onSuccess: () => {
      toast.success('User deleted');
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.users() });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

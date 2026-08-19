import { isSupabaseConfigured } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  invalidateKeys,
  patchListById,
  patchQueryData,
  restoreQueries,
  snapshotQueries,
  toastMutationError,
  type QuerySnapshot,
} from '../lib/optimistic';
import { inventoryKeys } from '../lib/query-keys';
import {
  depositCustomerAccount,
  fetchCustomerAccountTransactions,
  type DepositCustomerAccountInput,
} from '../services/customer-accounts';
import type { CustomerListRow } from '../types';

export function useCustomerAccountTransactions(customerId?: string) {
  return useQuery({
    queryKey: inventoryKeys.customerAccountTransactions(customerId),
    queryFn: () => fetchCustomerAccountTransactions(customerId!),
    enabled: isSupabaseConfigured && Boolean(customerId),
  });
}

export function useDepositCustomerAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DepositCustomerAccountInput) => depositCustomerAccount(input),
    onMutate: async (input) => {
      const keys = [
        inventoryKeys.customers(),
        inventoryKeys.customer(input.customerId),
        inventoryKeys.customerAccountTransactions(input.customerId),
      ];
      const previous = await snapshotQueries(queryClient, ...keys);
      const applyBalance = (item: CustomerListRow): CustomerListRow => ({
        ...item,
        accountBalance: (item.accountBalance ?? 0) + input.amount,
      });
      patchListById<CustomerListRow>(queryClient, inventoryKeys.customers(), input.customerId, applyBalance);
      patchQueryData<CustomerListRow>(
        queryClient,
        inventoryKeys.customer(input.customerId),
        applyBalance,
      );
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) restoreQueries(queryClient, context.previous as QuerySnapshot);
      toastMutationError(error);
    },
    onSettled: (_data, _error, input) => {
      void invalidateKeys(
        queryClient,
        inventoryKeys.customers(),
        inventoryKeys.customer(input.customerId),
        inventoryKeys.customerAccountTransactions(input.customerId),
      );
    },
  });
}

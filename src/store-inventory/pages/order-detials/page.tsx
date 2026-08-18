import { useSearchParams } from 'react-router-dom';
import { isSupabaseConfigured } from '@/lib/supabase';
import { allOrderListMockData } from '@/store-inventory/data/orders';
import { useOrders } from '@/store-inventory/hooks/use-inventory';
import { OrderListTable } from '../tables/order-list';

export function OrderDetailsPage() {
  const [searchParams] = useSearchParams();
  const { data, isLoading, isError } = useOrders();
  const orders = isSupabaseConfigured ? (data ?? []) : (data ?? allOrderListMockData);
  const selectedOrderId = searchParams.get('id') ?? undefined;

  return (
    <div className="container-fluid space-y-5 lg:space-y-9">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-foreground">Order Details</h1>
        <span className="text-sm text-muted-foreground">
          Select an order to view items, shipping, and payment summary.
        </span>
      </div>
      <OrderListTable
        mockData={orders}
        isLoading={isLoading}
        isError={isError}
        displaySheet="orderDetails"
        selectedOrderId={selectedOrderId}
      />
    </div>
  );
}

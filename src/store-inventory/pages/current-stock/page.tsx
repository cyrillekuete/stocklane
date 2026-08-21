import { StockNavbar } from '../components/stock-navbar';
import { CurrentStockTable } from '../tables/current-stock';
import { useCurrentStock } from '@/store-inventory/hooks/use-inventory';
import { useWarehouseFilter } from '@/store-inventory/lib/warehouse-filter';

export function CurrentStock() {
  const { warehouseId } = useWarehouseFilter();
  const { data, isLoading, isError } = useCurrentStock(warehouseId);
  return (
    <>
      <StockNavbar />
      <div className="container-fluid">
        <CurrentStockTable
          mockData={data}
          isLoading={isLoading}
          isError={isError}
          warehouseId={warehouseId}
        />
      </div>
    </>
  );
}

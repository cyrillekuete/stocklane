import { AllStockTable } from '../tables/all-stock';
import { Inventory } from './total-asset';
import { useAllStock } from '@/store-inventory/hooks/use-inventory';
import { useWarehouseFilter } from '@/store-inventory/lib/warehouse-filter';
import { StockNavbar } from '../components/stock-navbar';

export function AllStock() {
  const { warehouseId } = useWarehouseFilter();
  const { data, isLoading, isError } = useAllStock(warehouseId);
  return (
    <>
      <StockNavbar />
      <div className="container-fluid">
        <div className="grid gap-5 lg:gap-7.5">
          <Inventory />
          <AllStockTable
            mockData={data}
            isLoading={isLoading}
            isError={isError}
            warehouseId={warehouseId}
          />
        </div>
      </div>
    </>
  );
}

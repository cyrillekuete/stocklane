import { AllStockTable } from '../tables/all-stock';
import { Inventory } from './total-asset';
import { useAllStock } from '@/store-inventory/hooks/use-inventory';

export function AllStock() {
  const { data } = useAllStock();
  return (
    <div className="container-fluid">
      <div className="grid gap-5 lg:gap-7.5">
        <Inventory />
        <AllStockTable mockData={data} />
      </div>
    </div>
  );
}

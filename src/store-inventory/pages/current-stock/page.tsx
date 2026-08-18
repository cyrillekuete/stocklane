import { StockNavbar } from '../components/stock-navbar';
import { CurrentStockTable } from '../tables/current-stock';
import { useCurrentStock } from '@/store-inventory/hooks/use-inventory';

export function CurrentStock() {
  const { data } = useCurrentStock();
  return (
    <>
      <StockNavbar />
      <div className="container-fluid">
        <CurrentStockTable mockData={data} />
      </div>
    </>
  );
}

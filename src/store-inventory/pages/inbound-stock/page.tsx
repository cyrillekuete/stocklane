import { StockNavbar } from '../components/stock-navbar';
import { InboundStockTable } from '../tables/inbound-stock';
import { useInboundStock } from '@/store-inventory/hooks/use-inventory';

export function InboundStock() {
  const { data } = useInboundStock();
  return (
    <>
      <StockNavbar />
      <div className="container-fluid">
        <InboundStockTable mockData={data} />
      </div>
    </>
  );
}

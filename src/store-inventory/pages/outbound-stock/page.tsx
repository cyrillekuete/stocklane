import { StockNavbar } from '../components/stock-navbar';
import { OutboundStockTable } from '../tables/outbound-stock';
import { useOutboundStock } from '@/store-inventory/hooks/use-inventory';

export function OutboundStock() {
  const { data } = useOutboundStock();
  return (
    <>
      <StockNavbar />
      <div className="container-fluid">
        <OutboundStockTable mockData={data} />
      </div>
    </>
  );
}

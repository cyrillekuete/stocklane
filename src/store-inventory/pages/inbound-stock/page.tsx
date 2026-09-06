import { Link } from 'react-router-dom';
import { useT } from '@/i18n/use-t';
import { StockNavbar } from '../components/stock-navbar';
import { InboundStockTable } from '../tables/inbound-stock';
import { useInboundStock } from '@/store-inventory/hooks/use-inventory';
import { useWarehouseFilter } from '@/store-inventory/lib/warehouse-filter';

export function InboundStock() {
  const t = useT();
  const { data } = useInboundStock();
  const { warehouseId } = useWarehouseFilter();
  const rows = warehouseId
    ? (data ?? []).filter((row) => row.warehouseId === warehouseId)
    : data;

  return (
    <>
      <StockNavbar />
      <div className="container-fluid space-y-5">
        <p className="text-sm text-muted-foreground">
          {t('Purchased stock receipts.')}{' '}
          <Link to="/store-inventory/stock-entry" className="text-primary font-medium hover:underline">
            {t('Stock Entry')}
          </Link>
        </p>
        <InboundStockTable mockData={rows} />
      </div>
    </>
  );
}

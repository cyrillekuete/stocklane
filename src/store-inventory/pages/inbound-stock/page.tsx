import { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/use-t';
import { StockNavbar } from '../components/stock-navbar';
import { ReceiveStockSheet } from '../components/receive-stock-sheet';
import { InboundStockTable } from '../tables/inbound-stock';
import { useInboundStock } from '@/store-inventory/hooks/use-inventory';
import { useWarehouseFilter } from '@/store-inventory/lib/warehouse-filter';

export function InboundStock() {
  const t = useT();
  const { data } = useInboundStock();
  const { warehouseId } = useWarehouseFilter();
  const [receiveOpen, setReceiveOpen] = useState(false);
  const rows = warehouseId
    ? (data ?? []).filter((row) => row.warehouseId === warehouseId)
    : data;

  return (
    <>
      <StockNavbar />
      <div className="container-fluid space-y-5">
        <div className="flex justify-end">
          <Button variant="mono" onClick={() => setReceiveOpen(true)}>
            <PlusIcon />
            {t('Receive Stock')}
          </Button>
        </div>
        <InboundStockTable mockData={rows} />
      </div>
      <ReceiveStockSheet open={receiveOpen} onOpenChange={setReceiveOpen} />
    </>
  );
}

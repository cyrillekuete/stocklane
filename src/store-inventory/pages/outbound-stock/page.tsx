import { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StockNavbar } from '../components/stock-navbar';
import { ShipStockSheet } from '../components/ship-stock-sheet';
import { OutboundStockTable } from '../tables/outbound-stock';
import { useOutboundStock } from '@/store-inventory/hooks/use-inventory';
import { useWarehouseFilter } from '@/store-inventory/lib/warehouse-filter';

export function OutboundStock() {
  const { warehouseId } = useWarehouseFilter();
  const { data } = useOutboundStock();
  const [shipOpen, setShipOpen] = useState(false);
  const rows = warehouseId
    ? (data ?? []).filter((row) => row.warehouseId === warehouseId)
    : (data ?? []);

  return (
    <>
      <StockNavbar />
      <div className="container-fluid space-y-5">
        <div className="flex justify-end">
          <Button variant="mono" onClick={() => setShipOpen(true)}>
            <PlusIcon />
            Ship Stock
          </Button>
        </div>
        <OutboundStockTable mockData={rows} />
      </div>
      <ShipStockSheet open={shipOpen} onOpenChange={setShipOpen} />
    </>
  );
}

import { Button } from '@/components/ui/button';
import { StockPlannerTable } from '../tables/stock-planner';
import { useStockPlanner } from '@/store-inventory/hooks/use-inventory';
import { useWarehouseFilter } from '@/store-inventory/lib/warehouse-filter';
import { WarehouseSelect } from '../components/warehouse-select';

export function StockPlanner() {
  const { data } = useStockPlanner();
  const { warehouseId } = useWarehouseFilter();
  return (
    <div className="container-fluid space-y-5 lg:space-y-9">
      <div className="flex items-center flex-wrap gap-2.5 justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground">Stock Planner</h1>
          <span className="text-sm text-muted-foreground">
            Smart planning for stock and reorders.
            {warehouseId
              ? ' Quantity edits use the selected warehouse.'
              : ' Select a warehouse before editing quantities.'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <WarehouseSelect allowAll={false} />
          <Button variant="outline" className="gap-2">
            Reports
          </Button>
          <Button variant="mono" className="gap-2">
            Start New Order
          </Button>
        </div>
      </div>
      <StockPlannerTable mockData={data} warehouseId={warehouseId} />
    </div>
  );
}

import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/use-t';
import { StockPlannerTable } from '../tables/stock-planner';
import { useStockPlanner } from '@/store-inventory/hooks/use-inventory';
import { useWarehouseFilter } from '@/store-inventory/lib/warehouse-filter';
import { WarehouseSelect } from '../components/warehouse-select';

export function StockPlanner() {
  const t = useT();
  const { data } = useStockPlanner();
  const { warehouseId } = useWarehouseFilter();
  return (
    <div className="container-fluid space-y-5 lg:space-y-9">
      <div className="flex items-center flex-wrap gap-2.5 justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground">{t('Stock Planner')}</h1>
          <span className="text-sm text-muted-foreground">
            {t('Smart planning for stock and reorders.')}{' '}
            {warehouseId
              ? t('Quantity edits use the selected warehouse.')
              : t('Select a warehouse before editing quantities.')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <WarehouseSelect allowAll={false} />
          <Button variant="outline" className="gap-2">
            {t('Reports')}
          </Button>
          <Button variant="mono" className="gap-2">
            {t('Start New Order')}
          </Button>
        </div>
      </div>
      <StockPlannerTable mockData={data} warehouseId={warehouseId} />
    </div>
  );
}

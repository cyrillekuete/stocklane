import { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWarehouseList } from '@/store-inventory/hooks/use-warehouses';
import { WarehouseFormSheet } from '../components/warehouse-form-sheet';
import { WarehouseListTable } from '../tables/warehouse-list';

export function WarehouseList() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data } = useWarehouseList();
  const total = data?.length ?? 0;
  const active = data?.filter((row) => row.status.label.toLowerCase() === 'active').length ?? 0;

  return (
    <div className="container-fluid space-y-5 lg:space-y-9">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h3 className="text-xl font-semibold text-foreground">Warehouses</h3>
          <span className="text-sm text-muted-foreground">
            {total} {total === 1 ? 'warehouse' : 'warehouses'}. {active} active. Inventory is stored per warehouse.
          </span>
        </div>
        <Button variant="mono" onClick={() => setCreateOpen(true)}>
          <PlusIcon />
          Add Warehouse
        </Button>
      </div>
      <WarehouseListTable mockData={data} />
      <WarehouseFormSheet mode="new" open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

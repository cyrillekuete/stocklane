import { useState } from 'react';
import { Info, PlusIcon } from 'lucide-react';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useActiveWarehouses, useWarehouseList } from '@/store-inventory/hooks/use-warehouses';
import { WarehouseFormSheet } from '../components/warehouse-form-sheet';
import { WarehouseListTable } from '../tables/warehouse-list';

export function WarehouseList() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data } = useWarehouseList();
  const { data: activeWarehouses } = useActiveWarehouses();
  const total = data?.length ?? 0;
  const active = activeWarehouses?.length ?? 0;

  return (
    <div className="container-fluid space-y-5 lg:space-y-9">
      <div className="flex items-center justify-between gap-3">
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

      {total > 0 && active === 0 ? (
        <Alert variant="mono" icon="warning">
          <AlertIcon>
            <Info />
          </AlertIcon>
          <AlertTitle>
            No Active warehouses. Activate a warehouse before receiving stock, creating products, or using POS.
          </AlertTitle>
        </Alert>
      ) : null}

      {total === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
          <h4 className="text-base font-medium text-foreground">No warehouses yet</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first warehouse to start tracking inventory by location.
          </p>
          <Button variant="mono" className="mt-4" onClick={() => setCreateOpen(true)}>
            <PlusIcon />
            Add Warehouse
          </Button>
        </div>
      ) : (
        <WarehouseListTable mockData={data} />
      )}

      <WarehouseFormSheet mode="new" open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

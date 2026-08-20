import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useActiveWarehouses } from '@/store-inventory/hooks/use-warehouses';
import { useWarehouseFilter } from '@/store-inventory/lib/warehouse-filter';

export function WarehouseSelect({
  allowAll = true,
  value,
  onValueChange,
  className,
}: {
  allowAll?: boolean;
  value?: string | null;
  onValueChange?: (id: string | null) => void;
  className?: string;
}) {
  const filter = useWarehouseFilter();
  const { data: warehouses } = useActiveWarehouses();
  const selected = value !== undefined ? value : filter.warehouseId;
  const handleChange = onValueChange ?? filter.setWarehouseId;
  const hasWarehouses = (warehouses ?? []).length > 0;

  return (
    <Select
      value={selected ?? (allowAll ? 'all' : undefined)}
      onValueChange={(next) => handleChange(next === 'all' ? null : next)}
      disabled={!hasWarehouses && !allowAll}
    >
      <SelectTrigger className={className ?? 'w-[220px]'}>
        <SelectValue placeholder={hasWarehouses ? 'Warehouse' : 'Activate a warehouse first'} />
      </SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value="all">All warehouses</SelectItem>}
        {(warehouses ?? []).map((warehouse) => (
          <SelectItem key={warehouse.id} value={warehouse.id}>
            {warehouse.name} ({warehouse.code})
            {warehouse.isDefault ? ' · Default' : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

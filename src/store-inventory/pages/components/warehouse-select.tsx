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

  return (
    <Select
      value={selected ?? 'all'}
      onValueChange={(next) => handleChange(next === 'all' ? null : next)}
    >
      <SelectTrigger className={className ?? 'w-[220px]'}>
        <SelectValue placeholder="Warehouse" />
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

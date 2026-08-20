import { Link } from 'react-router-dom';
import { BadgeDot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatMoney } from '@/store-inventory/lib/format';
import { useStockSummary } from '@/store-inventory/hooks/use-inventory';

interface InventoryRow {
  name: string;
  qty: number;
}
type InventoryRows = Array<InventoryRow>;

interface InventoryItem {
  badgeColor: string;
  label: string;
}
type InventoryItems = Array<InventoryItem>;

type InventoryProps = object;

const Inventory = ({}: InventoryProps) => {
  const { data: summary } = useStockSummary();
  const inStock = summary?.inStock ?? 0;
  const lowStock = summary?.lowStock ?? 0;
  const outOfStock = summary?.outOfStock ?? 0;
  const totalValue = summary?.totalValue ?? 0;
  const totalBuckets = Math.max(inStock + lowStock + outOfStock, 1);
  const rows: InventoryRows = (summary?.lowStockProducts ?? []).map((row) => ({
    name: row.name,
    qty: row.qty,
  }));

  const items: InventoryItems = [
    { badgeColor: 'bg-green-500 size-2', label: 'Available' },
    { badgeColor: 'bg-yellow-500 size-2', label: 'Low stock' },
    { badgeColor: 'bg-destructive size-2', label: 'Out of stock' },
  ];

  const renderItem = (item: InventoryItem, index: number) => {
    return (
      <div key={index} className="flex items-center gap-1.5">
        <BadgeDot className={item.badgeColor} />
        <span className="text-sm font-normal text-secondary-foreground">
          {item.label}
        </span>
      </div>
    );
  };

  const renderRow = (row: InventoryRow, index: number) => {
    return (
      <div
        key={index}
        className="flex items-center justify-between bg-accent/50 rounded-md px-4 py-2 text-sm gap-2"
      >
        <span className="text-foreground font-normal">{row.name}</span>
        <div className="flex items-center gap-3">
          <span className="text-foreground font-normal shrink-0">
            Qty: {row.qty}
          </span>
          <Separator className="bg-gray-300 h-3" orientation="vertical" />
          <Link
            to="/store-inventory/stock-planner"
            className="hover:text-primary hover:underline hover:underline-offset-2"
          >
            Order
          </Link>
        </div>
      </div>
    );
  };

  return (
    <Card className="h-full">
      <CardHeader className="lg:px-7.5">
        <CardTitle>Inventory</CardTitle>
        <Button mode="link" underline="solid" asChild>
          <Link to="/store-inventory/current-stock">See All</Link>
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col justify-between gap-2 p-5 lg:p-7.5">
        <div>
          <div className="flex flex-col gap-0.5 mb-2">
            <span className="text-sm font-normal text-muted-foreground">
              Total Asset Value
            </span>
            <span className="text-3xl font-semibold text-foreground">
              {formatMoney(totalValue)}
            </span>
          </div>

          <div className="flex items-center gap-1 mb-2.5">
            <div
              className="bg-green-500 h-2 rounded-xs"
              style={{ width: `${(inStock / totalBuckets) * 100}%` }}
            />
            <div
              className="bg-yellow-500 h-2 rounded-xs"
              style={{ width: `${(lowStock / totalBuckets) * 100}%` }}
            />
            <div
              className="bg-destructive h-2 rounded-xs"
              style={{ width: `${(outOfStock / totalBuckets) * 100}%` }}
            />
          </div>

          <div className="flex items-center flex-wrap gap-4 mb-3.5">
            {items.map((item, index) => renderItem(item, index))}
          </div>

          <div className="flex items-center justify-between mb-0.5">
            <span className="text-foreground font-medium text-sm">
              Low stock
            </span>
            <Button mode="link" underline="solid" asChild>
              <Link to="/store-inventory/stock-planner">See All</Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {rows.length ? (
            rows.map((row, index) => renderRow(row, index))
          ) : (
            <div className="text-sm text-muted-foreground px-1 py-2">
              No low-stock products right now.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export {
  Inventory,
  type InventoryRow,
  type InventoryRows,
  type InventoryItem,
  type InventoryItems,
  type InventoryProps,
};

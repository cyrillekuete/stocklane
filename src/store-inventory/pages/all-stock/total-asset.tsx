import { BadgeDot } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatMoney } from '@/store-inventory/lib/format';
import { useStockSummary } from '@/store-inventory/hooks/use-inventory';

interface InventoryItem {
  badgeColor: string;
  label: string;
  total: number;
}
type InventoryItems = Array<InventoryItem>;

type InventoryProps = object;

const Inventory = ({}: InventoryProps) => {
  const { data: summary } = useStockSummary();
  const inStock = summary?.inStock ?? 0;
  const lowStock = summary?.lowStock ?? 0;
  const outOfStock = summary?.outOfStock ?? 0;
  const productCount = summary?.productCount ?? 0;
  const totalValue = summary?.totalValue ?? 0;
  const totalBuckets = Math.max(inStock + lowStock + outOfStock, 1);

  const items: InventoryItems = [
    {
      badgeColor: 'opacity-100 bg-green-500 size-2',
      label: 'In stock',
      total: inStock,
    },
    {
      badgeColor: 'opacity-100 bg-yellow-500 size-2',
      label: 'Low stock',
      total: lowStock,
    },
    {
      badgeColor: 'opacity-100 bg-destructive size-2',
      label: 'Out of stock',
      total: outOfStock,
    },
  ];

  const renderItem = (item: InventoryItem, index: number) => {
    return (
      <div key={index} className="flex items-center gap-1.5">
        <BadgeDot className={item.badgeColor} />
        <span className="text-sm font-normal text-secondary-foreground">
          {item.label}:
          <span className="text-sm font-semibold text-foreground ms-1">
            {item.total}
          </span>
        </span>
      </div>
    );
  };

  return (
    <Card>
      <CardContent className="flex gap-2 lg:gap-6 p-5 lg:p-7.5">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-normal text-muted-foreground">
            Total Asset Value
          </span>
          <span className="text-3xl font-semibold text-foreground">
            {formatMoney(totalValue)}
          </span>
        </div>

        <Separator className="mx-5" orientation="vertical" />

        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-center gap-2 mb-2 -mt-1">
            <span className="text-xl font-semibold text-dark leading-0">
              {productCount}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              products
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

          <div className="flex items-center flex-wrap gap-4 -mb-1">
            {items.map((item, index) => renderItem(item, index))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export {
  Inventory,
  type InventoryItem,
  type InventoryItems,
  type InventoryProps,
};

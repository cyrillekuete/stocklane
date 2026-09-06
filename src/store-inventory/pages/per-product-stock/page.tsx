'use client';

import { useState } from 'react';
import { useT } from '@/i18n/use-t';
import { formatMoney } from '@/store-inventory/lib/format';
import { PerProductStockSheet } from '../components/per-product-stock-sheet';
import { ProductListTable } from '../tables/product-list';
import { WarehouseSelect } from '../components/warehouse-select';
import { useCurrentStock, useProducts } from '@/store-inventory/hooks/use-inventory';
import { useWarehouseFilter } from '@/store-inventory/lib/warehouse-filter';
import type { CurrentStockRow, ProductListRow } from '@/store-inventory/types';

function stockRowFromProduct(product: ProductListRow, stock?: CurrentStockRow): CurrentStockRow {
  if (stock) return stock;
  return {
    id: product.id,
    productInfo: product.productInfo,
    stock: 0,
    rsvd: 0,
    tlvl: 0,
    delta: { label: '0', variant: 'secondary' },
    sum: formatMoney(0),
    lastMoved: product.updated || '—',
    handler: '',
    trend: { label: 'Steady', variant: 'secondary' },
    category: product.category,
    price: product.price,
    created: product.created,
    updated: product.updated,
  };
}

export function PerProductStockPage() {
  const t = useT();
  const { warehouseId } = useWarehouseFilter();
  const { data: products, isLoading, isError } = useProducts();
  const { data: stockRows } = useCurrentStock(warehouseId);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<CurrentStockRow | undefined>();

  const handleProductOpen = (product: ProductListRow) => {
    const match = stockRows?.find((row) => row.id === product.id);
    setSelectedStock(stockRowFromProduct(product, match));
    setIsSheetOpen(true);
  };

  return (
    <div className="container-fluid space-y-5 lg:space-y-9">
      <div className="flex items-center flex-wrap gap-2.5 justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground">{t('Per Product Stock')}</h1>
          <span className="text-sm text-muted-foreground">
            {t('Select a product to edit warehouse stock rules.')}{' '}
            {warehouseId
              ? t('Quantity edits use the selected warehouse.')
              : t('Select a warehouse before editing quantities.')}
          </span>
        </div>
        <WarehouseSelect />
      </div>
      <ProductListTable
        mockData={products}
        isLoading={isLoading}
        isError={isError}
        onProductOpen={handleProductOpen}
      />
      <PerProductStockSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        data={selectedStock}
        initialWarehouseId={warehouseId}
      />
    </div>
  );
}

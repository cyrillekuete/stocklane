'use client';

import { useState } from 'react';
import { PerProductStockSheet } from '../components/per-product-stock-sheet';
import { ProductListTable } from '../tables/product-list';
import { WarehouseSelect } from '../components/warehouse-select';

export function PerProductStockPage() {
  const [isSheetOpen, setIsSheetOpen] = useState(true);

  return (
    <div className="container-fluid space-y-4">
      <div className="flex justify-end">
        <WarehouseSelect />
      </div>
      <ProductListTable />
      <PerProductStockSheet open={isSheetOpen} onOpenChange={setIsSheetOpen} />
    </div>
  );
}

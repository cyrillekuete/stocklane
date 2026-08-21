import { useMemo, useState } from 'react';
import { PlusIcon, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/use-t';
import { isSupabaseConfigured } from '@/lib/supabase';
import { productListMockData } from '@/store-inventory/data/products';
import { useProducts } from '@/store-inventory/hooks/use-inventory';
import { ProductFormSheet } from '../components/product-form-sheet';
import { ProductListTable } from '../tables/product-list';

export function ProductList() {
  const t = useT();
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
  const { data, isLoading, isError } = useProducts();
  const products = isSupabaseConfigured ? (data ?? []) : (data ?? productListMockData);

  const summary = useMemo(() => {
    const total = products.length;
    const live = products.filter((product) => product.status.label === 'Live').length;
    const livePct = total ? Math.round((live / total) * 100) : 0;
    return { total, livePct };
  }, [products]);

  return (
    <div className="container-fluid space-y-5 lg:space-y-9">
      <div className="flex items-center flex-wrap gap-2.5 justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground">{t('Product List')}</h1>
          <span className="text-sm text-muted-foreground">
            {t('{total} products found. {livePct}% are Live.', {
              total: summary.total,
              livePct: summary.livePct,
            })}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            {t('Import')}
          </Button>
          <Button
            variant="mono"
            className="gap-2"
            onClick={() => setIsCreateProductOpen(true)}
          >
            <PlusIcon className="h-4 w-4" />
            {t('Add Product')}
          </Button>
        </div>
      </div>

      <ProductListTable
        mockData={data}
        isLoading={isLoading}
        isError={isError}
      />

      <ProductFormSheet
        mode="new"
        open={isCreateProductOpen}
        onOpenChange={setIsCreateProductOpen}
      />
    </div>
  );
}

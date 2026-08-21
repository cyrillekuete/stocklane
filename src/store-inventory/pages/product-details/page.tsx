import { useSearchParams } from 'react-router-dom';
import { useT } from '@/i18n/use-t';
import { useProducts } from '@/store-inventory/hooks/use-inventory';
import { ProductListTable } from '../tables/product-list';

export function ProductDetailsPage() {
  const t = useT();
  const [searchParams] = useSearchParams();
  const { data, isLoading, isError } = useProducts();
  const selectedProductId = searchParams.get('id') ?? undefined;

  return (
    <div className="container-fluid space-y-5 lg:space-y-9">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-foreground">{t('Product Details')}</h1>
        <span className="text-sm text-muted-foreground">
          {t('Select a product to view details, inventory, and variants.')}
        </span>
      </div>
      <ProductListTable
        mockData={data}
        isLoading={isLoading}
        isError={isError}
        displaySheet="productDetails"
        selectedProductId={selectedProductId}
      />
    </div>
  );
}

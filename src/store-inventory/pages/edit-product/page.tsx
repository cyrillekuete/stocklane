import { useSearchParams } from 'react-router-dom';
import { useT } from '@/i18n/use-t';
import { useProducts } from '@/store-inventory/hooks/use-inventory';
import { ProductListTable } from '../tables/product-list';

export function EditProductPage() {
  const t = useT();
  const [searchParams] = useSearchParams();
  const { data, isLoading, isError } = useProducts();
  const selectedProductId = searchParams.get('id') ?? undefined;

  return (
    <div className="container-fluid space-y-5 lg:space-y-9">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-foreground">{t('Edit Product')}</h1>
        <span className="text-sm text-muted-foreground">
          {t('Choose a product from the list to edit it.')}
        </span>
      </div>
      <ProductListTable
        mockData={data}
        isLoading={isLoading}
        isError={isError}
        displaySheet="editProduct"
        selectedProductId={selectedProductId}
      />
    </div>
  );
}

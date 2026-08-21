import { useSearchParams } from 'react-router-dom';
import { useT } from '@/i18n/use-t';
import { useProducts } from '@/store-inventory/hooks/use-inventory';
import { ProductListTable } from '../tables/product-list';

export function ManageVariantsPage() {
  const t = useT();
  const [searchParams] = useSearchParams();
  const { data, isLoading, isError } = useProducts();
  const selectedProductId = searchParams.get('id') ?? undefined;

  return (
    <div className="container-fluid space-y-5 lg:space-y-9">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-foreground">{t('Manage Variants')}</h1>
        <span className="text-sm text-muted-foreground">
          {t('Select a product to edit its option dimensions, such as size and color.')}
        </span>
      </div>
      <ProductListTable
        mockData={data}
        isLoading={isLoading}
        isError={isError}
        displaySheet="manageVariants"
        selectedProductId={selectedProductId}
      />
    </div>
  );
}

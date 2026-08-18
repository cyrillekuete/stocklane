import { useProducts } from '@/store-inventory/hooks/use-inventory';
import { ProductListTable } from '../tables/product-list';

export function CreateProductPage() {
  const { data, isLoading, isError } = useProducts();

  return (
    <div className="container-fluid space-y-5 lg:space-y-9">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-foreground">Create Product</h1>
        <span className="text-sm text-muted-foreground">
          Add a new product, then manage its variants from the list.
        </span>
      </div>
      <ProductListTable
        mockData={data}
        isLoading={isLoading}
        isError={isError}
        displaySheet="createProduct"
      />
    </div>
  );
}

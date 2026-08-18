import { useState } from 'react';
import { EditIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CategoryFormSheet } from '../components/category-form-sheet';
import { CategoryListTable } from '../tables/category-list';
import { useCategories } from '@/store-inventory/hooks/use-inventory';

export function EditCategoryPage() {
  const [isSheetOpen, setIsSheetOpen] = useState(true);
  const { data } = useCategories();

  return (
    <div className="container-fluid space-y-5 lg:space-y-9">
      <div className="flex items-center flex-wrap gap-2.5 justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground">Edit Category</h1>
          <span className="text-sm text-muted-foreground">
            Edit existing categories to organize your products
          </span>
        </div>
        <Button variant="mono" onClick={() => setIsSheetOpen(true)}>
          <EditIcon />
          Edit Category
        </Button>
      </div>

      <CategoryListTable mockData={data} />
      <CategoryFormSheet
        mode="edit"
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        category={data?.[0]}
      />
    </div>
  );
}

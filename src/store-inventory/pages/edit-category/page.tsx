import { EditIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CategoryListTable } from '../tables/category-list';
import { useCategories } from '@/store-inventory/hooks/use-inventory';

export function EditCategoryPage() {
  const { data } = useCategories();

  return (
    <div className="container-fluid space-y-5 lg:space-y-9">
      <div className="flex items-center flex-wrap gap-2.5 justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground">Edit Category</h1>
          <span className="text-sm text-muted-foreground">
            Select a category from the table to edit it
          </span>
        </div>
        <Button
          variant="mono"
          onClick={() => toast.message('Select a category row, then click Edit')}
        >
          <EditIcon />
          Edit Category
        </Button>
      </div>

      <CategoryListTable mockData={data} />
    </div>
  );
}

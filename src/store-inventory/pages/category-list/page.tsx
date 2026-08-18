'use client';

import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CategoryListTable } from '../tables/category-list';
import { CategoryFormSheet } from '../components/category-form-sheet';
import { useState } from 'react';
import { useCategories } from '@/store-inventory/hooks/use-inventory';

export function CategoryList() {
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const { data } = useCategories();
  const total = data?.length ?? 0;
  const active = data?.filter((category) => category.status.label.toLowerCase() === 'active').length ?? 0;
  const activePct = total ? Math.round((active / total) * 100) : 0;

  return (
    <div className="container-fluid space-y-5 lg:space-y-9">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h3 className="text-xl font-semibold text-foreground">
            Category List
          </h3>
          <span className="text-sm text-muted-foreground">
            {total} {total === 1 ? 'category' : 'categories'} found. {activePct}% are active.
          </span>
        </div>

        <Button variant="mono" onClick={() => setIsCreateCategoryOpen(true)}>
          <PlusIcon />
          Add Category
        </Button>
      </div>
      <CategoryListTable mockData={data} />
      <CategoryFormSheet
        mode="new"
        open={isCreateCategoryOpen}
        onOpenChange={setIsCreateCategoryOpen}
      />
    </div>
  );
}

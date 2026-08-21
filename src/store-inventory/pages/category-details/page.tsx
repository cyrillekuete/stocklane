'use client';

import { PlusIcon } from 'lucide-react';
import { useT } from '@/i18n/use-t';
import { Button } from '@/components/ui/button';
import { CategoryListTable } from '../tables/category-list';
import { CategoryFormSheet } from '../components/category-form-sheet';
import { useState } from 'react';
import { useCategories } from '@/store-inventory/hooks/use-inventory';

export function CategoryDetails() {
  const t = useT();
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
            {t('Category Details')}
          </h3>
          <span className="text-sm text-muted-foreground">
            {t('{count} {unit} found. {pct}% are active.', {
              count: total,
              unit: total === 1 ? t('category') : t('categories'),
              pct: activePct,
            })}
          </span>
        </div>

        <Button variant="mono" onClick={() => setIsCreateCategoryOpen(true)}>
          <PlusIcon />
          {t('Add Category')}
        </Button>
      </div>
      <CategoryListTable mockData={data} displaySheet="categoryDetails" />
      <CategoryFormSheet
        mode="new"
        open={isCreateCategoryOpen}
        onOpenChange={setIsCreateCategoryOpen}
      />
    </div>
  );
}

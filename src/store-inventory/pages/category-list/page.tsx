'use client';

import { useEffect, useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/use-t';
import { CategoryListTable } from '../tables/category-list';
import { useCategories } from '@/store-inventory/hooks/use-inventory';

export function CategoryList() {
  const t = useT();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const { data } = useCategories();
  const total = data?.length ?? 0;
  const active = data?.filter((category) => category.status.label.toLowerCase() === 'active').length ?? 0;
  const activePct = total ? Math.round((active / total) * 100) : 0;

  useEffect(() => {
    if (searchParams.get('sheet') === 'create') {
      setIsCreateCategoryOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('sheet');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <div className="container-fluid space-y-5 lg:space-y-9">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h3 className="text-xl font-semibold text-foreground">{t('Categories')}</h3>
          <span className="text-sm text-muted-foreground">
            {total === 0
              ? t('Organize products with categories.')
              : total === 1
                ? t('{count} category found. {pct}% are active.', { count: total, pct: activePct })
                : t('{count} categories found. {pct}% are active.', { count: total, pct: activePct })}
          </span>
        </div>

        <Button variant="mono" onClick={() => setIsCreateCategoryOpen(true)}>
          <PlusIcon />
          {t('Add Category')}
        </Button>
      </div>
      <CategoryListTable
        mockData={data}
        createOpen={isCreateCategoryOpen}
        onCreateOpenChange={setIsCreateCategoryOpen}
      />
    </div>
  );
}

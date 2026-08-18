import { useMemo, useState, useEffect } from 'react';
import {
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  RowSelectionState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { Eye, Info, Search, SquarePen, Trash, X } from 'lucide-react';
import { toast } from 'sonner';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Badge, BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardFooter,
  CardHeader,
  CardTable,
  CardToolbar,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import {
  DataGridTable,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from '@/components/ui/data-grid-table';
import { Input, InputWrapper } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { categoryListMockData } from '@/store-inventory/data/categories';
import type { CategoryListRow } from '@/store-inventory/types';
import { CategoryDetailsEditSheet } from '../components/category-details-edit-sheet';
import { CategoryFormSheet } from '../components/category-form-sheet';
import { useDeleteCategory, useUpdateCategory } from '@/store-inventory/hooks/use-inventory';
import { isSupabaseConfigured } from '@/lib/supabase';

interface CategoryListProps {
  mockData?: CategoryListRow[];
  displaySheet?: 'categoryDetails' | 'createCategory' | 'editCategory';
}

export function CategoryListTable({
  mockData: propsMockData,
  displaySheet,
}: CategoryListProps) {
  const data = propsMockData ?? (isSupabaseConfigured ? [] : categoryListMockData);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'id', desc: false },
  ]);
  const [featuredState, setFeaturedState] = useState<Record<string, boolean>>({});

  const [isCategoryDetailsEditOpen, setIsCategoryDetailsEditOpen] =
    useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryListRow | undefined>(
    undefined,
  );

  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const deleteCategory = useDeleteCategory();
  const updateCategory = useUpdateCategory();

  useEffect(() => {
    setFeaturedState(Object.fromEntries(data.map((item) => [item.id, item.featured])));
  }, [data]);

  useEffect(() => {
    if (!displaySheet) return;
    switch (displaySheet) {
      case 'categoryDetails':
        setIsCategoryDetailsEditOpen(true);
        break;
      case 'createCategory':
        setIsCreateCategoryOpen(true);
        break;
      case 'editCategory':
        setIsEditCategoryOpen(true);
        break;
    }
  }, [displaySheet]);

  useEffect(() => {
    if (!selectedCategory && data.length > 0 && (displaySheet === 'categoryDetails' || displaySheet === 'editCategory')) {
      setSelectedCategory(data[0]);
    }
  }, [data, displaySheet, selectedCategory]);

  const handleFeaturedChange = (id: string, checked: boolean) => {
    setFeaturedState((prev) => ({ ...prev, [id]: checked }));
    updateCategory.mutate({ id, input: { featured: checked } });

    if (checked) {
      toast.custom(
        (t) => (
          <Alert
            variant="mono"
            icon="success"
            close={true}
            onClose={() => toast.dismiss(t)}
          >
            <AlertIcon>
              <Info />
            </AlertIcon>
            <AlertTitle>Category marked as featured successfully.</AlertTitle>
          </Alert>
        ),
        {
          duration: 5000,
        },
      );
    } else {
      toast.custom(
        (t) => (
          <Alert
            variant="mono"
            icon="success"
            close={true}
            onClose={() => toast.dismiss(t)}
          >
            <AlertIcon>
              <Info />
            </AlertIcon>
            <AlertTitle>Category removed from featured status.</AlertTitle>
          </Alert>
        ),
        {
          duration: 5000,
        },
      );
    }
  };

  const handleCategoryClick = (category: CategoryListRow) => {
    setSelectedCategory(category);
    setIsCategoryDetailsEditOpen(true);
  };

  const columns = useMemo<ColumnDef<CategoryListRow>[]>(
    () => [
      {
        accessorKey: 'id',
        accessorFn: (row) => row.id,
        header: () => <DataGridTableRowSelectAll />,
        cell: ({ row }) => <DataGridTableRowSelect row={row} />,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        size: 23,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'productInfo',
        accessorFn: (row) => row.productInfo,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Category"
            column={column}
          />
        ),
        cell: (info) => {
          const productInfo = info.row.getValue(
            'productInfo',
          ) as CategoryListRow['productInfo'];
          return (
            <div className="flex items-center gap-2.5">
              <Card className="flex items-center justify-center rounded-md bg-accent/50 h-[40px] w-[50px] shadow-none shrink-0">
                <img
                  src={toAbsoluteUrl(
                    `/media/store/client/icons/light/${productInfo.image}`,
                  )}
                  className="cursor-pointer h-[30px] dark:hidden"
                  alt="image"
                />
                <img
                  src={toAbsoluteUrl(
                    `/media/store/client/icons/dark/${productInfo.image}`,
                  )}
                  className="cursor-pointer h-[30px] light:hidden"
                  alt="image"
                />
              </Card>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => handleCategoryClick(info.row.original)}
                  className="text-sm font-medium tracking-[-1%] cursor-pointer hover:text-primary text-left"
                >
                  {productInfo.title}
                </button>
                <span className="text-xs text-muted-foreground">
                  Category ID:{' '}
                  <span className="text-xs font-medium text-foreground">
                    {productInfo.label}
                  </span>
                </span>
              </div>
            </div>
          );
        },
        enableSorting: true,
        size: 150,
      },
      {
        id: 'productsQty',
        accessorFn: (row) => row.productsQty,
        header: ({ column }) => (
          <DataGridColumnHeader title="Products QTY" column={column} />
        ),
        cell: (info) => info.getValue() as string,
        enableSorting: true,
        size: 65,
      },
      {
        id: 'totalEarnings',
        accessorFn: (row) => row.totalEarnings,
        header: ({ column }) => (
          <DataGridColumnHeader title="Total Earnings" column={column} />
        ),
        cell: (info) => info.getValue() as string,
        enableSorting: true,
        size: 80,
      },
      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} />
        ),
        cell: (info) => {
          const status = info.row.original.status;
          const variant = status.variant as BadgeProps['variant'];
          return (
            <Badge variant={variant} appearance="light">
              {status.label}
            </Badge>
          );
        },
        enableSorting: true,
        size: 80,
      },
      {
        id: 'featured',
        header: ({ column }) => (
          <DataGridColumnHeader title="Featured" column={column} />
        ),
        enableSorting: true,
        cell: (info) => {
          const id = info.row.getValue('id') as string;
          return (
            <div className="flex justify-center">
              <Checkbox
                size="sm"
                id={`featured-${id}`}
                checked={!!featuredState[id]}
                onCheckedChange={(checked: unknown) =>
                  handleFeaturedChange(id, Boolean(checked))
                }
              />
            </div>
          );
        },
        size: 45,
      },
      {
        id: 'actions',
        header: () => '',
        enableSorting: false,
        cell: ({ row }) => {
          const category = row.original;

          const handleView = () => {
            setSelectedCategory(category);
            setIsCategoryDetailsEditOpen(true);
          };

          const handleEdit = () => {
            setSelectedCategory(category);
            setIsEditCategoryOpen(true);
          };

          const handleDelete = () => {
            deleteCategory.mutate(category.id, {
              onSuccess: () => {
                toast.custom((t) => (
                  <Alert variant="mono" icon="success" close={true} onClose={() => toast.dismiss(t)}>
                    <AlertIcon>
                      <Info />
                    </AlertIcon>
                    <AlertTitle>Category deleted</AlertTitle>
                  </Alert>
                ));
              },
              onError: (error) => {
                toast.error(error instanceof Error ? error.message : 'Unable to delete category');
              },
            });
          };

          return (
            <div className="flex items-center gap-1">
              <Button
                variant="dim"
                mode="icon"
                size="sm"
                onClick={handleView}
                title="View category"
              >
                <Eye />
              </Button>
              <Button
                variant="dim"
                mode="icon"
                size="sm"
                onClick={handleEdit}
                title="Edit category"
              >
                <SquarePen />
              </Button>
              <Button
                variant="dim"
                mode="icon"
                size="sm"
                onClick={handleDelete}
                title="Delete category"
              >
                <Trash />
              </Button>
            </div>
          );
        },
        size: 60,
      },
    ],
    [featuredState, deleteCategory],
  );

  const filteredData = useMemo(() => {
    let result = [...data];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) =>
        item.productInfo.title.toLowerCase().includes(query),
      );
    }
    return result;
  }, [data, searchQuery]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      pagination,
      sorting,
      rowSelection,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <>
      <DataGrid
        table={table}
        recordCount={filteredData?.length || 0}
        tableLayout={{
          columnsPinnable: true,
          columnsMovable: true,
          columnsVisibility: true,
          cellBorder: true,
        }}
      >
      <Card>
        <CardHeader className="py-3.5">
          <CardToolbar className="flex items-center gap-2">
            <InputWrapper className="w-full lg:w-[200px]">
              <Search/>
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <Button
                  variant="dim"
                  size="sm"
                  className="-me-3.5"
                  onClick={() => setSearchQuery('')}
                >
                  <X/>
                </Button>
              )}
            </InputWrapper>
          </CardToolbar>
        </CardHeader>
        <CardTable>
          <ScrollArea>
            <DataGridTable />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardTable>
        <CardFooter>
          <DataGridPagination />
        </CardFooter>
        </Card>
      </DataGrid>

      <CategoryDetailsEditSheet
        open={isCategoryDetailsEditOpen}
        onOpenChange={setIsCategoryDetailsEditOpen}
        category={selectedCategory}
      />

      <CategoryFormSheet
        mode="edit"
        open={isEditCategoryOpen}
        onOpenChange={setIsEditCategoryOpen}
        category={selectedCategory}
      />

      <CategoryFormSheet
        mode="new"
        open={isCreateCategoryOpen}
        onOpenChange={setIsCreateCategoryOpen}
      />
    </>
  );
}

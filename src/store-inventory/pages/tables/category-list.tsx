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
import { Archive, Eye, Info, PlusIcon, Search, SquarePen, Trash, X } from 'lucide-react';
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
import { CategoryDeleteDialog } from '../components/category-delete-dialog';
import { CategoryDetailsEditSheet } from '../components/category-details-edit-sheet';
import { CategoryFormSheet } from '../components/category-form-sheet';
import {
  useArchiveCategories,
  useDeleteCategories,
  useDeleteCategory,
  useUpdateCategory,
} from '@/store-inventory/hooks/use-inventory';
import { CATEGORY_STATUSES } from '@/store-inventory/lib/category-validation';
import { isRemoteAsset, resolveCategoryIconSrc } from '@/store-inventory/lib/format';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CategoryListProps {
  mockData?: CategoryListRow[];
  displaySheet?: 'categoryDetails' | 'createCategory' | 'editCategory';
  /** Controlled create sheet (e.g. from Category List page header / ?sheet=create). */
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
}

export function CategoryListTable({
  mockData: propsMockData,
  displaySheet,
  createOpen,
  onCreateOpenChange,
}: CategoryListProps) {
  const data = propsMockData ?? (isSupabaseConfigured ? [] : categoryListMockData);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([{ id: 'id', desc: false }]);

  const [isCategoryDetailsEditOpen, setIsCategoryDetailsEditOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryListRow | undefined>(undefined);
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);
  const [internalCreateOpen, setInternalCreateOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [categoryPendingDelete, setCategoryPendingDelete] = useState<CategoryListRow | undefined>();
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const deleteCategory = useDeleteCategory();
  const deleteCategories = useDeleteCategories();
  const archiveCategories = useArchiveCategories();
  const updateCategory = useUpdateCategory();

  const isCreateCategoryOpen = createOpen ?? internalCreateOpen;
  const setIsCreateCategoryOpen = onCreateOpenChange ?? setInternalCreateOpen;

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
        break;
    }
  }, [displaySheet, setIsCreateCategoryOpen]);

  useEffect(() => {
    if (!selectedCategory && data.length > 0 && displaySheet === 'categoryDetails') {
      setSelectedCategory(data[0]);
    }
  }, [data, displaySheet, selectedCategory]);

  const handleFeaturedChange = (id: string, checked: boolean) => {
    updateCategory.mutate(
      { id, input: { featured: checked } },
      {
        onSuccess: () => {
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
                <AlertTitle>
                  {checked
                    ? 'Category marked as featured successfully.'
                    : 'Category removed from featured status.'}
                </AlertTitle>
              </Alert>
            ),
            { duration: 5000 },
          );
        },
      },
    );
  };

  const handleCategoryClick = (category: CategoryListRow) => {
    setSelectedCategory(category);
    setIsCategoryDetailsEditOpen(true);
  };

  const openDeleteConfirm = (category: CategoryListRow) => {
    setBulkDeleteIds([]);
    setCategoryPendingDelete(category);
    setConfirmDeleteOpen(true);
  };

  const selectedIds = useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection],
  );

  const handleBulkArchive = async () => {
    if (!selectedIds.length) return;
    try {
      const result = await archiveCategories.mutateAsync(selectedIds);
      toast.success(`Archived ${result.count} ${result.count === 1 ? 'category' : 'categories'}`);
      setRowSelection({});
    } catch {
      // toasted by mutation hook
    }
  };

  const openBulkDeleteConfirm = () => {
    if (!selectedIds.length) return;
    setCategoryPendingDelete(undefined);
    setBulkDeleteIds(selectedIds);
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async (reassignToCategoryId: string | null) => {
    try {
      if (bulkDeleteIds.length) {
        const result = await deleteCategories.mutateAsync({
          ids: bulkDeleteIds,
          reassignToCategoryId,
        });
        const title = result.reassigned
          ? `Deleted ${result.count} categories and reassigned products`
          : result.productCount > 0
            ? `Deleted ${result.count} categories. ${result.productCount} product(s) Uncategorized.`
            : `Deleted ${result.count} categories`;
        toast.success(title);
        setRowSelection({});
        setBulkDeleteIds([]);
      } else if (categoryPendingDelete?.id) {
        const result = await deleteCategory.mutateAsync({
          id: categoryPendingDelete.id,
          reassignToCategoryId,
        });
        const title = result.reassigned
          ? 'Category deleted and products reassigned'
          : result.productCount > 0
            ? `Category deleted. ${result.productCount} product(s) Uncategorized.`
            : 'Category deleted';
        toast.success(title);
        setCategoryPendingDelete(undefined);
      }
      setConfirmDeleteOpen(false);
    } catch {
      // toasted by mutation hook
    }
  };

  const columns = useMemo<ColumnDef<CategoryListRow>[]>(
    () => [
      {
        id: 'select',
        accessorKey: 'id',
        header: () => <DataGridTableRowSelectAll />,
        cell: ({ row }) => <DataGridTableRowSelect row={row} />,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        size: 23,
        meta: { cellClassName: '' },
      },
      {
        id: 'productInfo',
        accessorFn: (row) => row.productInfo,
        header: ({ column }) => <DataGridColumnHeader title="Category" column={column} />,
        cell: (info) => {
          const productInfo = info.row.getValue('productInfo') as CategoryListRow['productInfo'];
          const remote = isRemoteAsset(productInfo.image);
          return (
            <div className="flex items-center gap-2.5">
              <Card className="flex items-center justify-center rounded-md bg-accent/50 h-[40px] w-[50px] shadow-none shrink-0">
                {remote ? (
                  <img
                    src={productInfo.image}
                    className="cursor-pointer h-[30px] object-contain"
                    alt=""
                  />
                ) : (
                  <>
                    <img
                      src={toAbsoluteUrl(resolveCategoryIconSrc(productInfo.image, 'light'))}
                      className="cursor-pointer h-[30px] dark:hidden"
                      alt=""
                    />
                    <img
                      src={toAbsoluteUrl(resolveCategoryIconSrc(productInfo.image, 'dark'))}
                      className="cursor-pointer h-[30px] light:hidden"
                      alt=""
                    />
                  </>
                )}
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
                  Code:{' '}
                  <span className="text-xs font-medium text-foreground">{productInfo.label || '—'}</span>
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
        header: ({ column }) => <DataGridColumnHeader title="Products QTY" column={column} />,
        cell: (info) => info.getValue() as string,
        enableSorting: true,
        size: 65,
      },
      {
        id: 'totalEarnings',
        accessorFn: (row) => row.totalEarnings,
        header: ({ column }) => (
          <DataGridColumnHeader title="Earnings" column={column} />
        ),
        cell: () => (
          <span className="text-muted-foreground" title="Live sales earnings are not tracked yet">
            —
          </span>
        ),
        enableSorting: false,
        size: 70,
      },
      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: ({ column }) => <DataGridColumnHeader title="Status" column={column} />,
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
        header: ({ column }) => <DataGridColumnHeader title="Featured" column={column} />,
        enableSorting: true,
        cell: (info) => {
          const id = info.row.original.id;
          return (
            <div className="flex justify-center">
              <Checkbox
                size="sm"
                id={`featured-${id}`}
                checked={info.row.original.featured}
                onCheckedChange={(checked: unknown) => handleFeaturedChange(id, Boolean(checked))}
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
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="dim"
                mode="icon"
                size="sm"
                onClick={() => {
                  setSelectedCategory(category);
                  setIsCategoryDetailsEditOpen(true);
                }}
                title="View category"
              >
                <Eye />
              </Button>
              <Button
                variant="dim"
                mode="icon"
                size="sm"
                onClick={() => {
                  setSelectedCategory(category);
                  setIsEditCategoryOpen(true);
                }}
                title="Edit category"
              >
                <SquarePen />
              </Button>
              <Button
                variant="dim"
                mode="icon"
                size="sm"
                onClick={() => openDeleteConfirm(category)}
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
    [deleteCategory, updateCategory],
  );

  const filteredData = useMemo(() => {
    let result = [...data];
    if (statusFilter !== 'all') {
      result = result.filter(
        (item) => item.status.label.toLowerCase() === statusFilter.toLowerCase(),
      );
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) => item.productInfo.title.toLowerCase().includes(query));
    }
    return result;
  }, [data, searchQuery, statusFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { pagination, sorting, rowSelection },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const bulkPending = archiveCategories.isPending || deleteCategories.isPending;

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
            <CardToolbar className="flex items-center gap-2 flex-wrap">
              <InputWrapper className="w-full lg:w-[200px]">
                <Search />
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
                    <X />
                  </Button>
                )}
              </InputWrapper>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {CATEGORY_STATUSES.map((status) => (
                    <SelectItem key={status} value={status.toLowerCase()}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedIds.length > 0 ? (
                <div className="flex items-center gap-2 ms-auto">
                  <span className="text-sm text-muted-foreground">
                    {selectedIds.length} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkArchive}
                    disabled={bulkPending}
                  >
                    <Archive />
                    Archive
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={openBulkDeleteConfirm}
                    disabled={bulkPending}
                  >
                    <Trash />
                    Delete
                  </Button>
                </div>
              ) : null}
            </CardToolbar>
          </CardHeader>
          <CardTable>
            <ScrollArea>
              {filteredData.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
                  <p className="text-sm font-medium text-foreground">
                    {data.length === 0 ? 'No categories yet' : 'No categories match your filters'}
                  </p>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    {data.length === 0
                      ? 'Create a category to organize products in inventory and POS.'
                      : 'Try a different search or status filter.'}
                  </p>
                  {data.length === 0 ? (
                    <Button variant="mono" onClick={() => setIsCreateCategoryOpen(true)}>
                      <PlusIcon />
                      Add Category
                    </Button>
                  ) : null}
                </div>
              ) : (
                <>
                  <DataGridTable />
                  <ScrollBar orientation="horizontal" />
                </>
              )}
            </ScrollArea>
          </CardTable>
          {filteredData.length > 0 ? (
            <CardFooter>
              <DataGridPagination />
            </CardFooter>
          ) : null}
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

      <CategoryDeleteDialog
        open={confirmDeleteOpen}
        onOpenChange={(open) => {
          setConfirmDeleteOpen(open);
          if (!open) {
            setBulkDeleteIds([]);
            setCategoryPendingDelete(undefined);
          }
        }}
        category={categoryPendingDelete}
        categoryIds={bulkDeleteIds}
        categories={data}
        pending={deleteCategory.isPending || deleteCategories.isPending}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}

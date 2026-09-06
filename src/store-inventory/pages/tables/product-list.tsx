import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Column,
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  RowSelectionState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  EllipsisVertical,
  Filter,
  Info,
  RotateCcw,
  Search,
  Settings,
  Star,
  Trash,
  Trash2,
  X,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/i18n/use-t';
import { toAbsoluteUrl } from '@/lib/helpers';
import { resolveProductImageSrc } from '@/store-inventory/lib/format';
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
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnVisibility } from '@/components/ui/data-grid-column-visibility';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import {
  DataGridTable,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from '@/components/ui/data-grid-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input, InputWrapper } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductFormSheet } from '../components/product-form-sheet';
import { ProductDetailsAnalyticsSheet } from '../components/product-details-analytics-sheet';
import { ManageVariantsSheet } from '../components/manage-variants';
import {
  ProductHardDeleteDialog,
  ProductSoftDeleteDialog,
  useProductRestoreAction,
} from '../components/product-delete-dialogs';
import { cn } from '@/lib/utils';
import { productListMockData } from '@/store-inventory/data/products';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useDeleteProduct, useDeletedProducts } from '@/store-inventory/hooks/use-inventory';
import type { ProductListRow } from '@/store-inventory/types';

interface IColumnFilterProps<TData, TValue> {
  column: Column<TData, TValue>;
}

export type IData = ProductListRow;

interface ProductListProps {
  mockData?: ProductListRow[];
  isLoading?: boolean;
  isError?: boolean;
  onRowClick?: (productId: string) => void;
  onProductOpen?: (product: ProductListRow) => void;
  displaySheet?: 'productDetails' | 'createProduct' | 'editProduct' | 'manageVariants';
  selectedProductId?: string;
}

const mockData: ProductListRow[] = productListMockData;

export function ProductListTable({
  mockData: propsMockData,
  isLoading = false,
  isError = false,
  onRowClick,
  onProductOpen,
  displaySheet,
  selectedProductId,
}: ProductListProps) {
  const t = useT();
  const activeData = isSupabaseConfigured ? (propsMockData ?? []) : (propsMockData || mockData);
  const { data: deletedProducts = [] } = useDeletedProducts();
  const data = useMemo(() => {
    if (!isSupabaseConfigured) return activeData;
    const deletedIds = new Set(deletedProducts.map((p) => p.id));
    return [...activeData.filter((p) => !deletedIds.has(p.id)), ...deletedProducts];
  }, [activeData, deletedProducts]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created', desc: true }]);
  const [selectedLastMoved] = useState<string[]>([]);
  const [isProductDetailsOpen, setIsProductDetailsOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
  const [isManageVariantsOpen, setIsManageVariantsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductListRow | undefined>();
  const [softDeleteTarget, setSoftDeleteTarget] = useState<ProductListRow | null>(null);
  const [hardDeleteTarget, setHardDeleteTarget] = useState<ProductListRow | null>(null);
  const deleteProduct = useDeleteProduct();
  const { restore } = useProductRestoreAction();

  useEffect(() => {
    if (displaySheet === 'createProduct') {
      setIsCreateProductOpen(true);
    }
  }, [displaySheet]);

  useEffect(() => {
    if (!selectedProductId || data.length === 0) return;
    const match = data.find((product) => product.id === selectedProductId);
    if (!match) return;
    setSelectedProduct(match);
    if (displaySheet === 'productDetails') setIsProductDetailsOpen(true);
    if (displaySheet === 'editProduct') setIsEditProductOpen(true);
    if (displaySheet === 'manageVariants') setIsManageVariantsOpen(true);
  }, [selectedProductId, data, displaySheet]);

  const handleEditProduct = (product: ProductListRow) => {
    setSelectedProduct(product);
    setIsEditProductOpen(true);
  };

  const handleManageVariants = (product: ProductListRow) => {
    setSelectedProduct(product);
    setIsManageVariantsOpen(true);
  };

  const handleViewDetails = (product: ProductListRow) => {
    if (onProductOpen) {
      onProductOpen(product);
      return;
    }
    setSelectedProduct(product);
    setIsProductDetailsOpen(true);
  };

  const handleDeleteProduct = (product: ProductListRow) => {
    if (product.deletedAt) {
      setHardDeleteTarget(product);
      return;
    }
    setSoftDeleteTarget(product);
  };

  const confirmSoftDelete = () => {
    if (!softDeleteTarget) return;
    deleteProduct.mutate(softDeleteTarget.id, {
      onSuccess: () => {
        toast.custom((toastId) => (
          <Alert variant="mono" icon="success" onClose={() => toast.dismiss(toastId)}>
            <AlertIcon>
              <Info />
            </AlertIcon>
            <AlertTitle>{t('Product moved to trash')}</AlertTitle>
          </Alert>
        ));
        setSoftDeleteTarget(null);
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : t('Unable to delete product'));
      },
    });
  };

  const ColumnInputFilter = <TData, TValue>({ column }: IColumnFilterProps<TData, TValue>) => {
    return (
      <Input
        placeholder={t('Filter...')}
        value={(column.getFilterValue() as string) ?? ''}
        onChange={(event) => column.setFilterValue(event.target.value)}
        variant="sm"
        className="w-40"
      />
    );
  };

  const columns = useMemo<ColumnDef<IData>[]>(
    () => [
      {
        accessorKey: 'id',
        accessorFn: (row) => row.id,
        header: () => <DataGridTableRowSelectAll />,
        cell: ({ row }) => <DataGridTableRowSelect row={row} />,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        size: 40,
      },
      {
        id: 'productInfo',
        accessorFn: (row) => row.productInfo,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Product Info"
            filter={<ColumnInputFilter column={column} />}
            column={column}
          />
        ),
        cell: (info) => {
          const productInfo = info.row.getValue('productInfo') as {
            image: string;
            title: string;
            label: string;
            tooltip: string;
          };
          const imageSrc = resolveProductImageSrc(productInfo.image);
          const resolved =
            imageSrc.startsWith('http') || imageSrc.startsWith('data:') || imageSrc.startsWith('blob:')
              ? imageSrc
              : toAbsoluteUrl(imageSrc);

          return (
            <div className="flex items-center gap-2.5">
              <Card className="flex items-center justify-center rounded-md bg-accent/50 h-[40px] w-[50px] shadow-none shrink-0">
                <img src={resolved} className="cursor-pointer h-[40px]" alt="image" />
              </Card>
              <div className="flex flex-col gap-1">
                <span
                  className="text-sm font-medium text-foreground leading-3.5 cursor-pointer hover:text-primary transition-colors truncate max-w-[180px]"
                  onClick={() => handleViewDetails(info.row.original)}
                >
                  {productInfo.title}
                </span>
                <span className="text-xs text-muted-foreground uppercase">
                  {t('SKU')}:{' '}
                  <span className="text-xs font-medium text-secondary-foreground">{productInfo.label}</span>
                </span>
              </div>
            </div>
          );
        },
        enableSorting: true,
        size: 260,
      },
      {
        id: 'category',
        accessorFn: (row) => row.category,
        header: ({ column }) => <DataGridColumnHeader title="Category" column={column} />,
        cell: (info) => <div>{info.row.original.category}</div>,
        enableSorting: true,
        size: 140,
      },
      {
        id: 'price',
        accessorFn: (row) => row.price,
        header: ({ column }) => <DataGridColumnHeader title="Price" column={column} />,
        cell: (info) => info.row.original.price,
        enableSorting: true,
        size: 100,
      },
      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: ({ column }) => <DataGridColumnHeader title="Status" column={column} />,
        cell: (info) => {
          const status = info.row.original.status;
          return (
            <Badge variant={status.variant as BadgeProps['variant']} appearance="light">
              {t(info.row.original.deletedAt ? 'Trashed' : status.label)}
            </Badge>
          );
        },
        enableSorting: true,
        size: 120,
      },
      {
        id: 'created',
        accessorFn: (row) => row.created,
        header: ({ column }) => <DataGridColumnHeader title="Created" column={column} />,
        cell: (info) => info.row.original.created,
        enableSorting: true,
        size: 120,
      },
      {
        id: 'updated',
        accessorFn: (row) => row.updated,
        header: ({ column }) => <DataGridColumnHeader title="Updated" column={column} />,
        cell: (info) => info.row.original.updated,
        enableSorting: true,
        size: 120,
      },
      {
        id: 'featured',
        accessorFn: (row) => row.featured,
        header: ({ column }) => <DataGridColumnHeader title="Featured" column={column} />,
        cell: (info) =>
          info.row.original.featured ? (
            <Star className="size-4 text-amber-500 fill-amber-500" />
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        enableSorting: true,
        size: 90,
      },
      {
        id: 'actions',
        header: () => '',
        enableSorting: false,
        cell: ({ row }) => {
          const product = row.original;
          const isTrashed = Boolean(product.deletedAt);
          return (
            <div className="flex items-center justify-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" mode="icon" size="sm">
                    <EllipsisVertical />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="bottom">
                  {!isTrashed && (
                    <>
                      <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                        <Settings className="size-4" />
                        {t('Edit Product')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleManageVariants(product)}>
                        <Layers className="size-4" />
                        {t('Manage Variants')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleViewDetails(product)}>
                        <Info className="size-4" />
                        {t('View Details')}
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => handleDeleteProduct(product)}>
                        <Trash className="size-4" />
                        {t('Move to trash')}
                      </DropdownMenuItem>
                    </>
                  )}
                  {isTrashed && (
                    <>
                      <DropdownMenuItem onClick={() => restore(product.id)}>
                        <RotateCcw className="size-4" />
                        {t('Restore')}
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => setHardDeleteTarget(product)}>
                        <Trash2 className="size-4" />
                        {t('Delete permanently')}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        size: 80,
      },
    ],
    [onProductOpen, restore, t],
  );

  const filteredData = useMemo(() => {
    let result = [...data];

    if (activeTab === 'all') {
      result = result.filter((item) => !item.deletedAt);
    } else if (activeTab === 'live') {
      result = result.filter((item) => !item.deletedAt && item.status.label === 'Live' && !item.needsAction);
    } else if (activeTab === 'draft') {
      result = result.filter((item) => !item.deletedAt && item.status.label === 'Draft');
    } else if (activeTab === 'archived') {
      result = result.filter((item) => item.deletedAt || item.status.label === 'Archived');
    } else if (activeTab === 'actionNeeded') {
      result = result.filter((item) => !item.deletedAt && (item.needsAction || item.status.label === 'Must Act'));
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.productInfo.title.toLowerCase().includes(query) ||
          item.productInfo.label.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query) ||
          (item.barcode ?? '').toLowerCase().includes(query),
      );
    }

    return result;
  }, [data, activeTab, searchQuery]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [activeTab, searchQuery, selectedLastMoved]);

  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      pagination: { pageIndex: pagination.pageIndex, pageSize: 10 },
      sorting,
      rowSelection,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const activeOnly = data.filter((item) => !item.deletedAt);
  const tabs = [
    { id: 'all', label: t('All'), badge: activeOnly.length },
    {
      id: 'live',
      label: t('Live'),
      badge: activeOnly.filter((item) => item.status.label === 'Live' && !item.needsAction).length,
    },
    { id: 'draft', label: t('Draft'), badge: activeOnly.filter((item) => item.status.label === 'Draft').length },
    {
      id: 'archived',
      label: t('Archived'),
      badge: data.filter((item) => item.deletedAt || item.status.label === 'Archived').length,
    },
    {
      id: 'actionNeeded',
      label: t('Action Needed'),
      badge: activeOnly.filter((item) => item.needsAction || item.status.label === 'Must Act').length,
    },
  ];

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleClearInput = () => {
    setInputValue('');
    setSearchQuery('');
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-3">
      {isError && (
        <p className="text-sm text-destructive">{t('Unable to load products. Check your connection and try again.')}</p>
      )}
      {isLoading && <p className="text-sm text-muted-foreground">{t('Loading products...')}</p>}
      {!isLoading && !isError && activeData.length === 0 && deletedProducts.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('No products yet. Create your first product to get started.')}</p>
      )}
      <Card>
        <CardHeader className="py-3 flex-nowrap">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="m-0 p-0 w-full">
            <TabsList className="h-auto p-0 bg-transparent border-b-0 border-border rounded-none -ms-[3px] w-full">
              <div className="flex items-center gap-1 min-w-max">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={cn(
                      'relative text-foreground px-2 hover:text-primary data-[state=active]:text-primary data-[state=active]:shadow-none',
                      activeTab === tab.id ? 'font-medium' : 'font-normal',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {tab.label}
                      <Badge
                        size="sm"
                        variant={activeTab === tab.id ? 'primary' : 'outline'}
                        appearance="outline"
                        className={cn('rounded-full', activeTab === tab.id ? '' : 'bg-muted/60')}
                      >
                        {tab.badge}
                      </Badge>
                    </div>
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-px bg-primary -mb-[14px]" />
                    )}
                  </TabsTrigger>
                ))}
              </div>
            </TabsList>
          </Tabs>
          <CardToolbar className="flex items-center gap-2">
            <div className="w-full max-w-[200px]">
              <InputWrapper>
                <Search />
                <Input
                  placeholder={t('Search...')}
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    setSearchQuery(e.target.value);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                />
                <Button onClick={handleClearInput} variant="dim" className="-me-4" disabled={inputValue === ''}>
                  {inputValue !== '' && <X size={16} />}
                </Button>
              </InputWrapper>
            </div>
            <DataGridColumnVisibility
              table={table}
              trigger={
                <Button variant="outline">
                  <Filter className="size-3.5" />
                  {t('Filters')}
                </Button>
              }
            />
          </CardToolbar>
        </CardHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {tabs.map((tab) => (
            <TabsContent key={`content-${tab.id}`} value={tab.id} className="mt-0">
              <DataGrid
                table={table}
                recordCount={filteredData?.length || 0}
                onRowClick={
                  onProductOpen
                    ? (row: ProductListRow) => onProductOpen(row)
                    : onRowClick
                      ? (row: ProductListRow) => onRowClick(row.id)
                      : undefined
                }
                tableLayout={{
                  columnsPinnable: true,
                  columnsMovable: true,
                  columnsVisibility: true,
                  cellBorder: true,
                }}
              >
                <CardTable>
                  <ScrollArea>
                    <DataGridTable />
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </CardTable>
                <CardFooter>
                  <DataGridPagination />
                </CardFooter>
              </DataGrid>
            </TabsContent>
          ))}
        </Tabs>
      </Card>

      <ProductDetailsAnalyticsSheet
        open={isProductDetailsOpen}
        onOpenChange={setIsProductDetailsOpen}
        product={selectedProduct}
        onEdit={() => {
          setIsProductDetailsOpen(false);
          setIsEditProductOpen(true);
        }}
        onManageVariants={() => {
          setIsProductDetailsOpen(false);
          setIsManageVariantsOpen(true);
        }}
        onDelete={() => {
          if (!selectedProduct) return;
          handleDeleteProduct(selectedProduct);
          setIsProductDetailsOpen(false);
        }}
      />

      <ProductFormSheet
        mode="edit"
        open={isEditProductOpen}
        onOpenChange={setIsEditProductOpen}
        product={selectedProduct}
      />

      <ProductFormSheet mode="new" open={isCreateProductOpen} onOpenChange={setIsCreateProductOpen} />

      <ManageVariantsSheet
        open={isManageVariantsOpen}
        onOpenChange={setIsManageVariantsOpen}
        productId={selectedProduct?.id}
        productName={selectedProduct?.productInfo.title}
      />

      <ProductSoftDeleteDialog
        open={Boolean(softDeleteTarget)}
        onOpenChange={(open) => {
          if (!open) setSoftDeleteTarget(null);
        }}
        product={
          softDeleteTarget
            ? {
                id: softDeleteTarget.id,
                title: softDeleteTarget.productInfo.title,
                sku: softDeleteTarget.productInfo.label,
              }
            : null
        }
        confirming={deleteProduct.isPending}
        onConfirm={confirmSoftDelete}
      />

      <ProductHardDeleteDialog
        open={Boolean(hardDeleteTarget)}
        onOpenChange={(open) => {
          if (!open) setHardDeleteTarget(null);
        }}
        product={
          hardDeleteTarget
            ? {
                id: hardDeleteTarget.id,
                title: hardDeleteTarget.productInfo.title,
                sku: hardDeleteTarget.productInfo.label,
              }
            : null
        }
      />
    </div>
  );
}

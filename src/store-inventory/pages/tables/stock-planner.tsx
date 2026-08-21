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
  ChevronDown,
  EllipsisVertical,
  Info,
  Pencil,
  Search,
  Settings,
  Trash,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useT } from '@/i18n/use-t';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Badge, BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardFooter,
  CardHeader,
  CardHeading,
  CardTable,
  CardToolbar,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input, InputWrapper } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { stockPlannerMockData } from '@/store-inventory/data/stock';
import { PerProductStockSheet } from '../components/per-product-stock-sheet';
import { ProductDetailsAnalyticsSheet } from '../components/product-details-analytics-sheet';
import { useUpdateStockLevel } from '@/store-inventory/hooks/use-inventory';

interface IColumnFilterProps<TData, TValue> {
  column: Column<TData, TValue>;
}

export interface IData {
  id: string;
  productInfo: {
    image: string;
    title: string;
    label: string;
    tooltip: string;
  };
  stock: number;
  rsvd: number;
  tlvl: number;
  delta: {
    label: string;
    variant: string;
  };
  flow: number;
  reorderIn: {
    days: number;
    date: string;
  };
  reorder: number;
  leadTime: {
    days: number;
    date: string;
  };
  ar: boolean;
}

interface StockPlannerProps {
  mockData?: IData[];
  warehouseId?: string | null;
}

const mockData: IData[] = stockPlannerMockData;

const StockPlannerTable = ({ mockData: propsMockData, warehouseId }: StockPlannerProps) => {
  const t = useT();
  const data = propsMockData || mockData;
  const updateStock = useUpdateStockLevel();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [isStockSheetOpen, setIsStockSheetOpen] = useState(false);
  const [selectedStockProduct, setSelectedStockProduct] = useState<(typeof data)[number] | undefined>();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Modal state
  const [isProductDetailsOpen, setIsProductDetailsOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'id', desc: false },
  ]);
  const [searchQuery, setSearchQuery] = useState('');

  // Search input state
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync inputValue with searchQuery when searchQuery changes externally
  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);
  const [selectedStocks, setSelectedStocks] = useState<string[]>([]);
  const [selectedUpdated, setSelectedUpdated] = useState<string[]>([]);

  const ColumnInputFilter = <TData, TValue>({
    column,
  }: IColumnFilterProps<TData, TValue>) => {
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

  // Apply search, stock levels, and reorder filters
  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search filter - only search in product title
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) =>
        item.productInfo.title.toLowerCase().includes(query),
      );
    }

    // Apply stock level filter
    if (selectedStocks.length > 0) {
      result = result.filter((row) =>
        selectedStocks.includes(row.stock.toString()),
      );
    }

    // Apply reorder filter
    if (selectedUpdated.length > 0) {
      result = result.filter((row) =>
        selectedUpdated.includes(row.reorder.toString()),
      );
    }

    return result;
  }, [data, searchQuery, selectedStocks, selectedUpdated]);

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
        size: 50,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'productInfo',
        accessorFn: (row) => row.productInfo.title,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Product Info"
            filter={<ColumnInputFilter column={column} />}
            column={column}
          />
        ),
        cell: (info) => {
          const row = info.row.original;
          const handleProductClick = () => {
            setSelectedStockProduct(row);
            setIsStockSheetOpen(true);
          };

          return (
            <div className="flex items-center gap-2.5">
              <Card className="flex items-center justify-center rounded-md bg-accent/50 h-[40px] w-[50px] shadow-none shrink-0">
                <img
                  src={toAbsoluteUrl(
                    `/media/store/client/1200x1200/${row.productInfo.image}`,
                  )}
                  className="cursor-pointer h-[40px]"
                  alt={t('image')}
                />
              </Card>
              <div className="flex flex-col gap-1">
                {row.productInfo.title.includes('…') ||
                row.productInfo.title.includes('...') ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        to="#"
                        onClick={() => handleProductClick()}
                        className="text-sm font-medium text-foreground hover:text-primary leading-3.5 text-left"
                      >
                        {row.productInfo.title}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {row.productInfo.tooltip ||
                          row.productInfo.title.replace(/[….]/g, '')}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Link
                    to="#"
                    onClick={() => handleProductClick()}
                    className="text-sm font-medium text-foreground hover:text-primary leading-3.5 text-left"
                  >
                    {row.productInfo.title}
                  </Link>
                )}
                <span className="text-xs text-muted-foreground uppercase">
                  {t('sku:')}{' '}
                  <span className="text-xs font-medium text-secondary-foreground">
                    {row.productInfo.label}
                  </span>
                </span>
              </div>
            </div>
          );
        },
        filterFn: (row, filterValue) => {
          const title = row.original.productInfo.title.toLowerCase();
          const query = ((filterValue as string) || '').toLowerCase();
          if (!query) return true;
          return title.includes(query);
        },
        enableSorting: true,
        size: 260,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'stock',
        accessorFn: (row) => row.stock,
        header: ({ column }) => (
          <DataGridColumnHeader title="Stock" column={column} />
        ),
        cell: (info) => (
          <div className="text-center">{info.row.original.stock}</div>
        ),
        enableSorting: true,
        size: 80,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'rsvd',
        accessorFn: (row) => row.rsvd,
        header: ({ column }) => (
          <DataGridColumnHeader title="Rsvd" column={column} />
        ),
        cell: (info) => (
          <div className="text-center">{info.row.original.rsvd}</div>
        ),
        enableSorting: true,
        size: 80,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'tlvl',
        accessorFn: (row) => row.tlvl,
        header: ({ column }) => (
          <DataGridColumnHeader title="T-Lvl" column={column} />
        ),
        cell: (info) => (
          <div className="text-center">{info.row.original.tlvl}</div>
        ),
        enableSorting: true,
        size: 80,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'delta',
        accessorFn: (row) => row.delta.label,
        header: ({ column }) => (
          <DataGridColumnHeader title="Delta" column={column} />
        ),
        cell: (info) => {
          const delta = info.row.original.delta;
          const variant = delta.variant as keyof BadgeProps['variant'];
          return (
            <div className="text-center">
              <Badge variant={variant} appearance="light">
                {delta.label}
              </Badge>
            </div>
          );
        },
        enableSorting: true,
        size: 80,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'flow',
        accessorFn: (row) => row.flow,
        header: ({ column }) => (
          <DataGridColumnHeader title="Flow" column={column} />
        ),
        cell: (info) => (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-normal text-foreground">
              {info.row.original.flow}
            </span>
            <span className="text-xs font-normal text-secondary-foreground/60">
              {t('items/day')}
            </span>
          </div>
        ),
        enableSorting: true,
        size: 85,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'reorderIn',
        accessorFn: (row) => row.reorderIn.days,
        header: ({ column }) => (
          <DataGridColumnHeader title="Reorder In" column={column} />
        ),
        cell: (info) => (
          <div className="flex flex-col">
            <span className="text-sm font-normal text-foreground">
              {t('{days} days', { days: info.row.original.reorderIn.days })}
            </span>
            <span className="text-xs font-normal text-secondary-foreground/60">
              {info.row.original.reorderIn.date}
            </span>
          </div>
        ),
        enableSorting: true,
        size: 120,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'reorder',
        accessorFn: (row) => row.reorder,
        header: ({ column }) => (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-block">
                  <DataGridColumnHeader title="Reorder" column={column} />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('Reorder Quantity')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
        cell: (info) => (
          <div className="text-center">{info.row.original.reorder}</div>
        ),
        enableSorting: true,
        size: 90,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'leadTime',
        accessorFn: (row) => row.leadTime.days,
        header: ({ column }) => (
          <DataGridColumnHeader title="Lead Time" column={column} />
        ),
        cell: (info) => (
          <div className="flex flex-col">
            <span className="text-sm font-normal text-foreground">
              {t('{days} days', { days: info.row.original.leadTime.days })}
            </span>
            <span className="text-xs font-normal text-secondary-foreground">
              {info.row.original.leadTime.date}
            </span>
          </div>
        ),
        enableSorting: true,
        size: 120,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'ar',
        accessorFn: (row) => row.ar,
        header: ({ column }) => (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-block">
                  <DataGridColumnHeader title="AR" column={column} />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('Automatic Reorder')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
        cell: (info) => (
          <div className="text-center">
            <Switch
              id="size-sm"
              size="sm"
              defaultChecked={info.row.original.ar}
              onCheckedChange={(checked) => {
                updateStock.mutate({
                  productId: info.row.original.id,
                  input: {
                    auto_reorder: checked,
                    ...(warehouseId ? { warehouseId } : {}),
                  },
                });
                if (checked) {
                  toast.custom(
                    (toastId) => (
                      <Alert
                        variant="mono"
                        icon="success"
                        close={true}
                        onClose={() => toast.dismiss(toastId)}
                      >
                        <AlertIcon>
                          <Info />
                        </AlertIcon>
                        <AlertTitle>
                          {t('Auto-reorder enabled for this product.')}
                        </AlertTitle>
                      </Alert>
                    ),
                    {
                      duration: 5000,
                    },
                  );
                } else {
                  toast.custom(
                    (toastId) => (
                      <Alert
                        variant="mono"
                        icon="success"
                        close={true}
                        onClose={() => toast.dismiss(toastId)}
                      >
                        <AlertIcon>
                          <Info />
                        </AlertIcon>
                        <AlertTitle>
                          {t('Auto-reorder disabled for this product.')}
                        </AlertTitle>
                      </Alert>
                    ),
                    {
                      duration: 5000,
                    },
                  );
                }
              }}
            />
          </div>
        ),
        enableSorting: true,
        size: 70,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'actions',
        header: () => '',
        enableSorting: false,
        cell: () => (
          <div className="text-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="dim" mode="icon" size="sm" className="">
                  <EllipsisVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom">
                <DropdownMenuLabel>{t('Actions')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings />
                  {t('Settings')}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Pencil />
                  {t('Edit')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  <Trash />
                  {t('Delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
        size: 60,
      },
    ],
    [updateStock, warehouseId, t],
  );

  useEffect(() => {
    const selectedRowIds = Object.keys(rowSelection);
    if (selectedRowIds.length > 0) {
      toast(t('Total {count} are selected.', { count: selectedRowIds.length }), {
        description: t('Selected row IDs: {ids}', { ids: selectedRowIds.join(', ') }),
        action: {
          label: t('Undo'),
          onClick: () => setRowSelection({}),
        },
      });
    }
  }, [rowSelection, t]);

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

  const Title = useMemo(() => {
    const handleStockChange = (isChecked: boolean, stock: string) => {
      setSelectedStocks((prev) =>
        isChecked ? [...prev, stock] : prev.filter((s) => s !== stock),
      );
      // Reset pagination to first page when filters change
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    };

    const handleUpdatedChange = (isChecked: boolean, updated: string) => {
      setSelectedUpdated((prev) =>
        isChecked ? [...prev, updated] : prev.filter((u) => u !== updated),
      );
      // Reset pagination to first page when filters change
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    };

    // Search input handlers
    const handleClearInput = () => {
      setInputValue('');
      setSearchQuery('');
      // Reset pagination to first page when filters change
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
      inputRef.current?.focus();
    };

    return (
      <CardHeading className="flex items-center flex-wrap gap-2.5 space-y-0">
        {/* Search */}
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
            <Button
              onClick={handleClearInput}
              variant="dim"
              className="-me-4"
              disabled={inputValue === ''}
            >
              {inputValue !== '' && <X size={16} />}
            </Button>
          </InputWrapper>
        </div>

        {/* Reorder In Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              {t('Reorder In: 7 days')}
              {selectedUpdated.length > 0 && (
                <Badge variant="outline" size="sm">
                  {selectedUpdated.length}
                </Badge>
              )}
              <ChevronDown className="size-5 pt-0.5 -m-0.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <Command>
              <CommandInput placeholder={t('Search Reorder In...')} />
              <CommandList>
                <CommandEmpty>{t('No Reorder In found.')}</CommandEmpty>
                <CommandGroup>
                  {Array.from(new Set(data.map((row) => row.reorder))).map(
                    (reorder) => {
                      const reorderObj = data.find(
                        (row) => row.reorder === reorder,
                      );
                      const reorderIn = reorderObj?.reorderIn;
                      const count = data.filter(
                        (row) => row.reorder === reorder,
                      ).length;
                      return (
                        <CommandItem
                          key={reorder}
                          value={reorder.toString()}
                          className="flex items-center gap-2.5 bg-transparent!"
                          onSelect={() => {}}
                          data-disabled="true"
                        >
                          <Checkbox
                            id={reorder.toString()}
                            checked={selectedUpdated.includes(
                              reorder.toString(),
                            )}
                            onCheckedChange={(checked) =>
                              handleUpdatedChange(
                                checked === true,
                                reorder.toString(),
                              )
                            }
                            size="sm"
                          />
                          <Label
                            htmlFor={reorder.toString()}
                            className="grow flex items-center justify-between font-normal gap-1.5"
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-normal text-foreground">
                                {t('{days} days', { days: reorderIn?.days ?? 0 })}
                              </span>
                              <span className="text-xs font-normal text-secondary-foreground">
                                {reorderIn?.date}
                              </span>
                            </div>
                            <span className="text-muted-foreground font-semibold me-2.5">
                              {count}
                            </span>
                          </Label>
                        </CommandItem>
                      );
                    },
                  )}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Stock Level Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              {t('Stock Level')}
              {selectedStocks.length > 0 && (
                <Badge variant="outline" size="sm">
                  {selectedStocks.length}
                </Badge>
              )}
              <ChevronDown className="size-5 pt-0.5 -m-0.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <Command>
              <CommandInput placeholder={t('Search stock levels...')} />
              <CommandList>
                <CommandEmpty>{t('No stock levels found.')}</CommandEmpty>
                <CommandGroup>
                  {Array.from(
                    new Set(data.map((row) => row.stock.toString())),
                  ).map((stock) => {
                    const count = data.filter(
                      (row) => row.stock.toString() === stock,
                    ).length;
                    return (
                      <CommandItem
                        key={stock}
                        value={stock}
                        className="flex items-center gap-2.5 bg-transparent!"
                        onSelect={() => {}}
                        data-disabled="true"
                      >
                        <Checkbox
                          id={stock}
                          checked={selectedStocks.includes(stock)}
                          onCheckedChange={(checked) =>
                            handleStockChange(checked === true, stock)
                          }
                          size="sm"
                        />
                        <Label
                          htmlFor={stock}
                          className="grow flex items-center justify-between font-normal gap-1.5"
                        >
                          <span className="text-xs font-medium">{stock}</span>
                          <span className="text-muted-foreground font-semibold me-2.5">
                            {count}
                          </span>
                        </Label>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </CardHeading>
    );
  }, [
    inputValue,
    selectedStocks,
    selectedUpdated,
    data,
    setPagination,
    setInputValue,
    setSearchQuery,
    t,
  ]);

  return (
    <TooltipProvider>
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
              {Title}
              <CardToolbar>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedStockProduct(filteredData[0]);
                    setIsStockSheetOpen(true);
                  }}
                >
                  {t('Reports')}
                </Button>
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
        <PerProductStockSheet
          open={isStockSheetOpen}
          onOpenChange={setIsStockSheetOpen}
          data={
            selectedStockProduct
              ? {
                  ...selectedStockProduct,
                  reorderQty: selectedStockProduct.reorder,
                  leadTimeDays: selectedStockProduct.leadTime.days,
                  autoReorder: selectedStockProduct.ar,
                }
              : undefined
          }
        />

        {/* Product Details Analytics Modal */}
        <ProductDetailsAnalyticsSheet
          open={isProductDetailsOpen}
          onOpenChange={setIsProductDetailsOpen}
        />
      </>
    </TooltipProvider>
  );
};

export { StockPlannerTable };

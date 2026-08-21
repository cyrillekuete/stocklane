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
import { addDays, format, isWithinInterval, parse } from 'date-fns';
import {
  ChevronDown,
  EllipsisVertical,
  Info,
  Layers,
  LogIn,
  LogOut,
  Pencil,
  Search,
  Settings,
  Trash,
  X,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useT } from '@/i18n/use-t';
import { isSupabaseConfigured } from '@/lib/supabase';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Badge, BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { allStockMockData } from '@/store-inventory/data/stock';
import { useDeleteProduct } from '@/store-inventory/hooks/use-inventory';
import { PerProductStockSheet } from '../components/per-product-stock-sheet';
import { ProductSoftDeleteDialog } from '../components/product-delete-dialogs';

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
  stockFlow: {
    number1: number;
    number2: number;
    number3: number;
  };
  delta: {
    label: string;
    variant: string;
  };
  price: string;
  category: string;
  supplier: {
    logo: string;
    name: string;
  };
  updated: string;
}

interface AllStockProps {
  mockData?: IData[];
  isLoading?: boolean;
  isError?: boolean;
}

const mockData: IData[] = allStockMockData;

const AllStockTable = ({
  mockData: propsMockData,
  isLoading = false,
  isError = false,
}: AllStockProps) => {
  const t = useT();
  const data = isSupabaseConfigured ? (propsMockData ?? []) : (propsMockData || mockData);
  const deleteProduct = useDeleteProduct();
  const [productToDelete, setProductToDelete] = useState<IData | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'updated', desc: true },
  ]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<
    { name: string; logo: string }[]
  >([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Date range picker state
  const today = new Date();
  const defaultDateRange: DateRange = {
    from: addDays(today, -999), // Show last 30 days by default
    to: today,
  };
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    defaultDateRange,
  );
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(
    defaultDateRange,
  );
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const isApplyingRef = useRef(false);

  // Unique categories and suppliers with counts
  const uniqueCategories = useMemo(() => {
    const categories = new Set<string>();
    data.forEach((row) => {
      categories.add(row.category);
    });
    return Array.from(categories).map((id) => ({
      id,
      name: id,
    }));
  }, [data]);

  const uniqueSuppliers = useMemo(() => {
    const suppliers = new Set<string>();
    data.forEach((row) => {
      suppliers.add(row.supplier.name);
    });
    return Array.from(suppliers).map((name) => {
      const supplier = data.find((row) => row.supplier.name === name)?.supplier;
      return {
        id: name,
        name,
        logo: supplier?.logo || '',
      };
    });
  }, [data]);

  const categoryCounts = useMemo(() => {
    return data.reduce(
      (acc, row) => {
        acc[row.category] = (acc[row.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [data]);

  const supplierCounts = useMemo(() => {
    return data.reduce(
      (acc, row) => {
        acc[row.supplier.name] = (acc[row.supplier.name] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [data]);

  // Sync inputValue with searchQuery when searchQuery changes externally
  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  // Filter data based on selected filters
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const matchesCategory =
        selectedCategories.length === 0 ||
        selectedCategories.includes(row.category);
      const matchesSupplier =
        selectedSuppliers.length === 0 ||
        selectedSuppliers.some((s) => s.name === row.supplier.name);
      const matchesSearch =
        searchQuery === '' ||
        row.productInfo.title.toLowerCase().includes(searchQuery.toLowerCase());

      // Date range filtering
      let matchesDateRange = true;
      if (dateRange && (dateRange.from || dateRange.to)) {
        try {
          // Parse the date from "DD MMM, YYYY" format
          const rowDate = parse(row.updated, 'dd MMM, yyyy', new Date());

          if (dateRange.from && dateRange.to) {
            matchesDateRange = isWithinInterval(rowDate, {
              start: dateRange.from,
              end: dateRange.to,
            });
          } else if (dateRange.from) {
            matchesDateRange = rowDate >= dateRange.from;
          } else if (dateRange.to) {
            matchesDateRange = rowDate <= dateRange.to;
          }
        } catch {
          // If date parsing fails, include the row
          matchesDateRange = true;
        }
      }

      return (
        matchesCategory && matchesSupplier && matchesSearch && matchesDateRange
      );
    });
  }, [data, selectedCategories, selectedSuppliers, searchQuery, dateRange]);

  const handleCategoryChange = (isChecked: boolean, category: string) => {
    if (isChecked) {
      setSelectedCategories((prev) => [...prev, category]);
    } else {
      setSelectedCategories((prev) => prev.filter((c) => c !== category));
    }
    // Reset pagination to first page when filters change
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [, setSelectedProduct] = useState<IData | undefined>(
    undefined,
  );

  const handleSupplierChange = (
    isChecked: boolean,
    supplier: { name: string; logo: string },
  ) => {
    if (isChecked) {
      setSelectedSuppliers((prev) => [...prev, supplier]);
    } else {
      setSelectedSuppliers((prev) =>
        prev.filter((s) => s.name !== supplier.name),
      );
    }
    // Reset pagination to first page when filters change
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleProductClick = (product: IData) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  // Date range picker handlers
  const handleDateRangeApply = () => {
    isApplyingRef.current = true;
    if (tempDateRange) {
      setDateRange(tempDateRange);
    }
    setIsDatePickerOpen(false);
    setTimeout(() => {
      isApplyingRef.current = false;
    }, 100);
  };

  const handleDateRangeReset = () => {
    isApplyingRef.current = true;
    setTempDateRange(defaultDateRange);
    setDateRange(defaultDateRange);
    // Reset pagination to first page when filters change
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setIsDatePickerOpen(false);
    setTimeout(() => {
      isApplyingRef.current = false;
    }, 100);
  };

  const handleDateRangeCancel = () => {
    isApplyingRef.current = true;
    // Reset temp state to actual state when canceling
    setTempDateRange(dateRange);
    setIsDatePickerOpen(false);
    setTimeout(() => {
      isApplyingRef.current = false;
    }, 100);
  };

  const handleDateRangeSelect = (selected: DateRange | undefined) => {
    setTempDateRange({
      from: selected?.from || undefined,
      to: selected?.to || undefined,
    });
  };

  // Search input handlers
  const handleClearInput = () => {
    setInputValue('');
    setSearchQuery('');
    // Reset pagination to first page when filters change
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    inputRef.current?.focus();
  };

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
          return (
            <div className="flex items-center gap-2.5">
              <Card className="flex items-center justify-center rounded-md bg-accent/50 h-[40px] w-[50px] shadow-none shrink-0">
                <img
                  src={toAbsoluteUrl(
                    `/media/store/client/1200x1200/${productInfo.image}`,
                  )}
                  className="cursor-pointer h-[40px]"
                  alt={t('image')}
                />
              </Card>

              <div className="flex flex-col gap-1">
                {productInfo.title.includes('…') ||
                productInfo.title.includes('...') ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                    <Link
                        to="#"
                        onClick={() => handleProductClick(info.row.original)}
                        className="text-sm font-medium text-foreground hover:text-primary leading-3.5 text-left"
                      >
                        {productInfo.title}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {productInfo.tooltip ||
                          productInfo.title.replace(/[….]/g, '')}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Link
                    to="#"
                    className="text-sm font-medium text-foreground hover:text-primary leading-3.5 text-left"
                  >
                    {productInfo.title}
                  </Link>
                )}

                <span className="inline-flex items-center gap-0.5">
                  <span className="text-xs text-muted-foreground uppercase">
                    {t('sku:')}
                  </span>{' '}
                  <span className="text-xs font-medium text-secondary-foreground">
                    {productInfo.label}
                  </span>
                </span>
              </div>
            </div>
          );
        },
        enableSorting: true,
        size: 270,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'stockFlow',
        accessorFn: (row) => row.stockFlow,
        header: ({ column }) => (
          <DataGridColumnHeader title="Stock Flow" column={column} />
        ),
        cell: (info) => {
          const stockFlow = info.row.getValue('stockFlow') as {
            number1: number;
            number2: number;
            number3: number;
          };
          return (
            <div className="flex items-center gap-1.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5">
                      <Layers className="size-3.5 text-gray-400 shrink-0" />
                      <span className="text-sm font-medium text-gray-900">
                        {stockFlow.number1}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('Current Stock')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Separator className="h-4 mx-0.5" orientation="vertical" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5">
                      <LogIn className="size-3.5 text-gray-400 shrink-0" />
                      <span className="text-sm font-medium text-gray-900">
                        {stockFlow.number2}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('Inbound Stock')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Separator className="h-4 mx-0.5" orientation="vertical" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5">
                      <LogOut className="size-3.5 text-gray-400 shrink-0" />
                      <span className="text-sm font-medium text-gray-900">
                        {stockFlow.number3}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('Outbound Stock')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        },
        enableSorting: true,
        size: 190,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'delta',
        accessorFn: (row) => row.delta,
        header: ({ column }) => (
          <DataGridColumnHeader title="Delta" column={column} />
        ),
        cell: (info) => {
          const delta = info.row.original.delta;
          const variant = delta.variant as keyof BadgeProps['variant'];
          return (
            <Badge variant={variant} appearance="light">
              {delta.label}
            </Badge>
          );
        },
        enableSorting: true,
        size: 90,
        meta: {
          cellClassName: 'text-center',
        },
      },
      {
        id: 'price',
        accessorFn: (row) => row.price,
        header: ({ column }) => (
          <DataGridColumnHeader title="Price" column={column} />
        ),
        cell: (info) => {
          return info.row.original.price;
        },
        enableSorting: true,
        size: 90,
        meta: {
          cellClassName: 'text-center',
        },
      },
      {
        id: 'category',
        accessorFn: (row) => row.category,
        header: ({ column }) => (
          <DataGridColumnHeader title="Category" column={column} />
        ),
        cell: (info) => {
          return info.row.original.category;
        },
        enableSorting: true,
        size: 100,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'supplier',
        accessorFn: (row) => row.supplier,
        header: ({ column }) => (
          <DataGridColumnHeader title="Supplier" column={column} />
        ),
        cell: (info) => {
          return (
            <div className="flex items-center gap-1.5">
              <img
                src={toAbsoluteUrl(
                  `/media/brand-logos/${info.row.original.supplier.logo}`,
                )}
                className="h-6 rounded-full"
                alt={t('image')}
              />
              <span className="leading-none text-secondary-foreground">
                {info.row.original.supplier.name}
              </span>
            </div>
          );
        },
        enableSorting: true,
        size: 160,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'updated',
        accessorFn: (row) => row.updated,
        header: ({ column }) => (
          <DataGridColumnHeader title="Updated" column={column} />
        ),
        cell: (info) => {
          return info.row.original.updated;
        },
        enableSorting: true,
        size: 130,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'actions',
        header: () => '',
        enableSorting: false,
        cell: () => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" mode="icon" size="sm">
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
              <DropdownMenuItem variant="destructive" onClick={() => setProductToDelete(row.original)}>
                <Trash />
                {t('Move to trash')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        size: 60,
      },
    ],
    [t],
  );

  useEffect(() => {
    const selectedRowIds = Object.keys(rowSelection);

    if (selectedRowIds.length > 0) {
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
              {t('Selected row IDs: {ids}', { ids: selectedRowIds.join(', ') })}
            </AlertTitle>
          </Alert>
        ),
        {
          duration: 5000,
        },
      );
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
    columnResizeMode: 'onChange',
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-3">
      {isError && (
        <p className="text-sm text-destructive">{t('Unable to load warehouse stock. Check your connection and try again.')}</p>
      )}
      {isLoading && (
        <p className="text-sm text-muted-foreground">{t('Loading stock...')}</p>
      )}
    <DataGrid
      table={table}
      recordCount={data.length}
      tableLayout={{
        columnsPinnable: true,
        columnsMovable: true,
        columnsVisibility: true,
        cellBorder: true,
      }}
    >
      <Card>
        <CardHeader className="py-3.5">
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

            {/* Date Range Filter */}
            <Popover
              open={isDatePickerOpen}
              onOpenChange={(open) => {
                if (open) {
                  // Sync temp state with actual state when opening
                  setTempDateRange(dateRange);
                  setIsDatePickerOpen(open);
                } else if (!isApplyingRef.current) {
                  // Only handle cancel if we're not in the middle of applying/resetting
                  setTempDateRange(dateRange);
                  setIsDatePickerOpen(open);
                }
              }}
            >
              <PopoverTrigger asChild>
                <Button type="button" variant="outline">
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'MMM dd')} -{' '}
                        {format(dateRange.to, 'MMM dd, yyyy')}
                      </>
                    ) : (
                      format(dateRange.from, 'MMM dd, yyyy')
                    )
                  ) : (
                    <span>{t('Pick date range')}</span>
                  )}
                  <ChevronDown className="size-4 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  autoFocus
                  mode="range"
                  defaultMonth={tempDateRange?.from || dateRange?.from}
                  showOutsideDays={false}
                  selected={tempDateRange} // <-- Only temp
                  onSelect={handleDateRangeSelect} // <-- Updates temp only
                  numberOfMonths={2}
                />
                <div className="flex items-center justify-between border-t border-border p-3">
                  <Button variant="outline" onClick={handleDateRangeReset}>
                    {t('Reset')}
                  </Button>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" onClick={handleDateRangeCancel}>
                      {t('Cancel')}
                    </Button>
                    <Button onClick={handleDateRangeApply}>{t('Apply')}</Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Category Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="relative">
                  {t('Category')}
                  {selectedCategories.length > 0 && (
                    <Badge variant="outline" size="sm">
                      {selectedCategories.length}
                    </Badge>
                  )}
                  <ChevronDown className="size-5 pt-0.5 -m-0.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-0" align="start">
                <Command>
                  <CommandInput placeholder={t('Search category...')} />
                  <CommandList>
                    <CommandEmpty>{t('No category found.')}</CommandEmpty>
                    <CommandGroup>
                      {uniqueCategories.map((category) => {
                        const count = categoryCounts[category.id] || 0;
                        return (
                          <CommandItem
                            key={category.id}
                            value={category.id}
                            className="flex items-center gap-2.5 bg-transparent!"
                            onSelect={() => {}}
                            data-disabled="true"
                          >
                            <Checkbox
                              id={category.id}
                              checked={selectedCategories.includes(category.id)}
                              onCheckedChange={(checked) =>
                                handleCategoryChange(
                                  checked === true,
                                  category.id,
                                )
                              }
                              size="sm"
                            />
                            <Label
                              htmlFor={category.id}
                              className="grow flex items-center justify-between font-normal gap-1.5"
                            >
                              <span>{category.name}</span>
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

            {/* Supplier Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="relative">
                  {t('Supplier')}
                  {selectedSuppliers.length > 0 && (
                    <Badge variant="outline" size="sm">
                      {selectedSuppliers.length}
                    </Badge>
                  )}
                  <ChevronDown className="size-5 pt-0.5 -m-0.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-0" align="start">
                <Command>
                  <CommandInput placeholder={t('Search supplier...')} />
                  <CommandList>
                    <CommandEmpty>{t('No supplier found.')}</CommandEmpty>
                    <CommandGroup>
                      {uniqueSuppliers.map((supplier) => {
                        const count = supplierCounts[supplier.id] || 0;
                        return (
                          <CommandItem
                            key={supplier.id}
                            value={supplier.id}
                            className="flex items-center gap-2.5 bg-transparent!"
                            onSelect={() => {}}
                            data-disabled="true"
                          >
                            <Checkbox
                              id={supplier.id}
                              checked={selectedSuppliers.some(
                                (s) => s.name === supplier.name,
                              )}
                              onCheckedChange={(checked) =>
                                handleSupplierChange(checked === true, supplier)
                              }
                              size="sm"
                            />
                            <Label
                              htmlFor={supplier.id}
                              className="grow flex items-center justify-between font-normal gap-1.5"
                            >
                              <div className="flex items-center gap-1.5">
                                <img
                                  src={toAbsoluteUrl(
                                    `/media/brand-logos/${supplier.logo}`,
                                  )}
                                  alt={supplier.name}
                                  className="h-4 rounded-full"
                                />
                                <span>{supplier.name}</span>
                              </div>
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
          <CardToolbar>
            <Link to="/store-inventory/stock-planner">
              <Button variant="mono">{t('Stock Planner')}</Button>
            </Link>
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

      {/* Per Product Stock Modal */}
      <PerProductStockSheet
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />

      <ProductSoftDeleteDialog
        open={Boolean(productToDelete)}
        onOpenChange={(open) => {
          if (!open) setProductToDelete(null);
        }}
        product={
          productToDelete
            ? {
                id: productToDelete.id,
                title: productToDelete.productInfo.title,
                sku: productToDelete.productInfo.label,
              }
            : null
        }
        confirming={deleteProduct.isPending}
        onConfirm={() => {
          if (!productToDelete) return;
          deleteProduct.mutate(productToDelete.id, {
            onSuccess: () => {
              toast.success(t('Product moved to trash'));
              setProductToDelete(null);
            },
            onError: (error) => {
              toast.error(error instanceof Error ? t(error.message) : t('Unable to delete product'));
            },
          });
        }}
      />
    </DataGrid>
    </div>
  );
};

export { AllStockTable };

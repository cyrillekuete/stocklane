 
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
  Pencil,
  Search,
  Settings,
  Trash,
  X,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { currentStockMockData } from '@/store-inventory/data/stock';
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
  stock: number;
  rsvd: number;
  tlvl: number;
  delta: {
    label: string;
    variant: string;
  };
  sum: string;
  lastMoved: string;
  handler: string;
  trend: {
    label: string;
    variant: string;
  };
}

interface CurrentStockProps {
  mockData?: IData[];
  isLoading?: boolean;
  isError?: boolean;
}

const mockData: IData[] = currentStockMockData;

const CurrentStockTable = ({
  mockData: propsMockData,
  isLoading = false,
  isError = false,
}: CurrentStockProps) => {
  const data = isSupabaseConfigured ? (propsMockData ?? []) : (propsMockData || mockData);
  const deleteProduct = useDeleteProduct();
  const [productToDelete, setProductToDelete] = useState<IData | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'lastMoved', desc: true },
  ]);
  const [selectedTrends, setSelectedTrends] = useState<string[]>([]);
  const [selectedHandlers, setSelectedHandlers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<IData | undefined>(
    undefined,
  );

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

  // Unique trends and handlers with counts
  const uniqueTrends = useMemo(() => {
    const trends = new Set<string>();
    data.forEach((row) => {
      trends.add(row.trend.label);
    });
    return Array.from(trends).map((id) => ({
      id,
      name: id,
      variant:
        data.find((row) => row.trend.label === id)?.trend.variant ||
        'secondary',
    }));
  }, [data]);

  const uniqueHandlers = useMemo(() => {
    const handlers = new Set<string>();
    data.forEach((row) => {
      handlers.add(row.handler);
    });
    return Array.from(handlers).map((name) => ({
      id: name,
      name,
    }));
  }, [data]);

  const trendCounts = useMemo(() => {
    return data.reduce(
      (acc, row) => {
        acc[row.trend.label] = (acc[row.trend.label] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [data]);

  const handlerCounts = useMemo(() => {
    return data.reduce(
      (acc, row) => {
        acc[row.handler] = (acc[row.handler] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [data]);

  const handleTrendChange = (isChecked: boolean, trend: string) => {
    if (isChecked) {
      setSelectedTrends((prev) => [...prev, trend]);
    } else {
      setSelectedTrends((prev) => prev.filter((t) => t !== trend));
    }
    // Reset pagination to first page when filters change
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleHandlerChange = (isChecked: boolean, handler: string) => {
    if (isChecked) {
      setSelectedHandlers((prev) => [...prev, handler]);
    } else {
      setSelectedHandlers((prev) => prev.filter((h) => h !== handler));
    }
    // Reset pagination to first page when filters change
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleProductClick = (product: IData) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  // Search input handlers
  const handleClearInput = () => {
    setInputValue('');
    setSearchQuery('');
    // Reset pagination to first page when filters change
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  // Sync inputValue with searchQuery when searchQuery changes externally
  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  // Update search query when input changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue !== searchQuery) {
        setSearchQuery(inputValue);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, searchQuery]);

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

  const ColumnInputFilter = <TData, TValue>({
    column,
  }: IColumnFilterProps<TData, TValue>) => {
    return (
      <Input
        placeholder="Filter..."
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
                  alt="image"
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
                      <p>{productInfo.tooltip.replace(/[….]/g, '')}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Link
                    to="#"
                    onClick={() => handleProductClick(info.row.original)}
                    className="text-sm font-medium text-foreground hover:text-primary leading-3.5 text-left"
                  >
                    {productInfo.title}
                  </Link>
                )}
              </div>
            </div>
          );
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
        cell: (info) => {
          return <div className="text-center">{info.row.original.stock}</div>;
        },
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
        cell: (info) => {
          return <div className="text-center">{info.row.original.rsvd}</div>;
        },
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
        cell: (info) => {
          return <div className="text-center">{info.row.original.tlvl}</div>;
        },
        enableSorting: true,
        size: 80,
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
        size: 80,
        meta: {
          cellClassName: 'text-center',
        },
      },
      {
        id: 'sum',
        accessorFn: (row) => row.sum,
        header: ({ column }) => (
          <DataGridColumnHeader title="Sum" column={column} />
        ),
        cell: (info) => {
          return info.row.original.sum;
        },
        enableSorting: true,
        size: 100,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'lastMoved',
        accessorFn: (row) => row.lastMoved,
        header: ({ column }) => (
          <DataGridColumnHeader title="Last Moved" column={column} />
        ),
        cell: (info) => {
          return info.row.original.lastMoved;
        },
        enableSorting: true,
        size: 120,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'handler',
        accessorFn: (row) => row.handler,
        header: ({ column }) => (
          <DataGridColumnHeader title="Handler" column={column} />
        ),
        cell: (info) => {
          return info.row.original.handler;
        },
        enableSorting: true,
        size: 100,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'trend',
        accessorFn: (row) => row.trend,
        header: ({ column }) => (
          <DataGridColumnHeader title="Trend" column={column} />
        ),
        cell: (info) => {
          const trend = info.row.original.trend;
          const variant = trend.variant as keyof BadgeProps['variant'];
          return (
            <Badge variant={variant} appearance="light">
              {trend.label}
            </Badge>
          );
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
        cell: (info) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" mode="icon" size="sm">
                <EllipsisVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleProductClick(info.row.original)}
              >
                <Pencil />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setProductToDelete(info.row.original)}>
                <Trash />
                Move to trash
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        size: 60,
      },
    ],
    [],
  );

  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search filter across multiple fields
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      if (query) {
        result = result.filter((item) => {
          // Search in multiple fields
          return (
            item.productInfo.title.toLowerCase().includes(query) ||
            item.productInfo.label?.toLowerCase().includes(query) ||
            item.handler?.toLowerCase().includes(query) ||
            item.lastMoved?.toLowerCase().includes(query) ||
            item.trend?.label.toLowerCase().includes(query) ||
            item.sum?.toLowerCase().includes(query) ||
            item.id?.toLowerCase().includes(query)
          );
        });
      }
    }

    // Apply other filters
    result = result.filter((row) => {
      const matchesTrends =
        selectedTrends.length === 0 || selectedTrends.includes(row.trend.label);
      const matchesHandlers =
        selectedHandlers.length === 0 || selectedHandlers.includes(row.handler);

      // Date range filtering
      let matchesDateRange = true;
      if (dateRange && (dateRange.from || dateRange.to)) {
        try {
          // Parse the date from "DD MMM, YYYY" format
          const rowDate = parse(row.lastMoved, 'dd MMM, yyyy', new Date());

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

      return matchesTrends && matchesHandlers && matchesDateRange;
    });

    return result;
  }, [data, searchQuery, selectedTrends, selectedHandlers, dateRange]);

  useEffect(() => {
    const selectedRowIds = Object.keys(rowSelection);

    if (selectedRowIds.length > 0) {
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
              Selected row IDs: {selectedRowIds.join(', ')}
            </AlertTitle>
          </Alert>
        ),
        {
          duration: 5000,
        },
      );
    }
  }, [rowSelection]);

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
    <div className="space-y-3">
      {isError && (
        <p className="text-sm text-destructive">Unable to load warehouse stock. Check your connection and try again.</p>
      )}
      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading stock...</p>
      )}
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
          <CardHeading className="flex items-center flex-wrap gap-2.5 space-y-0">
            {/* Search */}
            <div className="w-full max-w-[200px]">
              <InputWrapper>
                <Search />
                <Input
                  placeholder="Search..."
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
                    <span>Pick date range</span>
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
                  selected={tempDateRange}
                  onSelect={handleDateRangeSelect}
                  numberOfMonths={2}
                />
                <div className="flex items-center justify-between border-t border-border p-3">
                  <Button variant="outline" onClick={handleDateRangeReset}>
                    Reset
                  </Button>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" onClick={handleDateRangeCancel}>
                      Cancel
                    </Button>
                    <Button onClick={handleDateRangeApply}>Apply</Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Trends Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="relative">
                  Trends
                  {selectedTrends.length > 0 && (
                    <Badge variant="outline" size="sm" className="ml-1.5">
                      {selectedTrends.length}
                    </Badge>
                  )}
                  <ChevronDown className="size-5 pt-0.5 -m-0.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search trends..." />
                  <CommandList>
                    <CommandEmpty>No trends found.</CommandEmpty>
                    <CommandGroup>
                      {uniqueTrends.map((trend) => {
                        const count = trendCounts[trend.id] || 0;
                        return (
                          <CommandItem
                            key={trend.id}
                            value={trend.id}
                            className="flex items-center gap-2.5 bg-transparent!"
                            onSelect={() => {}}
                            data-disabled="true"
                          >
                            <Checkbox
                              id={trend.id}
                              checked={selectedTrends.includes(trend.id)}
                              onCheckedChange={(checked) =>
                                handleTrendChange(checked === true, trend.id)
                              }
                              size="sm"
                            />
                            <Label
                              htmlFor={trend.id}
                              className="grow flex items-center justify-between font-normal gap-1.5"
                            >
                              <Badge
                                variant={
                                  trend.variant as
                                    | 'primary'
                                    | 'secondary'
                                    | 'success'
                                    | 'warning'
                                    | 'info'
                                    | 'outline'
                                    | 'destructive'
                                }
                                appearance="light"
                              >
                                {trend.name}
                              </Badge>
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

            {/* Handler Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="relative">
                  Handler
                  {selectedHandlers.length > 0 && (
                    <Badge variant="outline" size="sm" className="ml-1.5">
                      {selectedHandlers.length}
                    </Badge>
                  )}
                  <ChevronDown className="size-5 pt-0.5 -m-0.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search handler..." />
                  <CommandList>
                    <CommandEmpty>No handler found.</CommandEmpty>
                    <CommandGroup>
                      {uniqueHandlers.map((handler) => {
                        const count = handlerCounts[handler.id] || 0;
                        return (
                          <CommandItem
                            key={handler.id}
                            value={handler.id}
                            className="flex items-center gap-2.5 bg-transparent!"
                            onSelect={() => {}}
                            data-disabled="true"
                          >
                            <Checkbox
                              id={handler.id}
                              checked={selectedHandlers.includes(handler.id)}
                              onCheckedChange={(checked) =>
                                handleHandlerChange(
                                  checked === true,
                                  handler.id,
                                )
                              }
                              size="sm"
                            />
                            <Label
                              htmlFor={handler.id}
                              className="grow flex items-center justify-between font-normal gap-1.5"
                            >
                              <span>{handler.name}</span>
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
              <Button variant="mono">Stock Planner</Button>
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
        data={selectedProduct}
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
              toast.success('Product moved to trash');
              setProductToDelete(null);
            },
            onError: (error) => {
              toast.error(error instanceof Error ? error.message : 'Unable to delete product');
            },
          });
        }}
      />
    </DataGrid>
    </div>
  );
};

export { CurrentStockTable };

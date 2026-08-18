 'use client';
 
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
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { inboundStockMockData } from '@/store-inventory/data/stock';
import { useDeleteInboundShipment } from '@/store-inventory/hooks/use-inventory';
import { TrackShippingSheet } from '../components/track-shipping-sheet';
import { PerProductStockSheet } from '../components/per-product-stock-sheet';

interface IColumnFilterProps<TData, TValue> {
  column: Column<TData, TValue>;
}

export interface IData {
  id: string;
  productInfo: {
    title: string;
    label: string;
    tooltip: string;
  };
  dateOrder: string;
  qty: number;
  stock: string;
  status: {
    label: string;
    variant: string;
  };
  arrivalDate: string;
  carrier: string;
  supplier: {
    logo: string;
    name: string;
  };
}

interface AllStockProps {
  mockData?: IData[];
}

// Type for mapped data to match PerProductStockSheet requirements
interface MappedStockData {
  id: string;
  productInfo: {
    image: string;
    title: string;
    label: string;
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

const mockData: IData[] = inboundStockMockData;

const InboundStockTable = ({ mockData: propsMockData }: AllStockProps) => {
  const data = propsMockData || mockData;
  const deleteInbound = useDeleteInboundShipment();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'dateOrder', desc: true },
  ]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedDateOrder] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<
    { name: string; logo: string }[]
  >([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Modal state
  const [isTrackShippingOpen, setIsTrackShippingOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<IData | undefined>(
    undefined,
  );

  // PerProductStockSheet modal state
  const [isPerProductStockOpen, setIsPerProductStockOpen] = useState(false);
  const [selectedProductForStock, setSelectedProductForStock] = useState<MappedStockData | undefined>(undefined);

  const handleStatusChange = (isChecked: boolean, status: string) => {
    if (isChecked) {
      setSelectedStatuses((prev) => [...prev, status]);
    } else {
      setSelectedStatuses((prev) => prev.filter((s) => s !== status));
    }
    // Reset pagination to first page when filters change
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

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

  const handleShowClick = (product: IData) => {
    setSelectedProduct(product);
    setIsTrackShippingOpen(true);
  };

  const handleProductClick = (product: IData) => {
    // Map IData to CurrentStockData format
    const mappedData: MappedStockData = {
      id: product.id,
      productInfo: {
        image: 'default.png', // Default image since IData doesn't have image
        title: product.productInfo.title,
        label: product.productInfo.label,
      },
      stock: product.qty || 0,
      rsvd: 0, // Default value
      tlvl: 0, // Default value
      delta: {
        label: '+0',
        variant: 'success' as const,
      },
      sum: product.stock || '$0.00',
      lastMoved: product.dateOrder || '',
      handler: 'N/A', // Default value
      trend: {
        label: 'Normal',
        variant: 'info' as const,
      },
    };
    setSelectedProductForStock(mappedData);
    setIsPerProductStockOpen(true);
  };

  // Search input handlers
  const handleClearInput = () => {
    setInputValue('');
    setSearchQuery('');
    // Reset pagination to first page when filters change
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    inputRef.current?.focus();
  };

  // Sync inputValue with searchQuery when searchQuery changes externally
  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

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

  // Filter data based on selected filters
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      // Apply supplier filter
      const matchesSupplier =
        selectedSuppliers.length === 0 ||
        selectedSuppliers.some((s) => s.name === row.supplier?.name);

      // Apply status filter
      const matchesStatus =
        selectedStatuses.length === 0 ||
        selectedStatuses.includes(row.status?.label);

      // Apply date order filter
      const matchesDateOrder =
        selectedDateOrder.length === 0 ||
        selectedDateOrder.includes(row.dateOrder);

      // Apply search query
      const matchesSearch =
        !searchQuery ||
        [
          row.productInfo?.title,
          row.productInfo?.label,
          row.id,
          row.carrier,
          row.supplier?.name,
          row.status?.label,
          row.stock,
          row.arrivalDate,
          row.dateOrder,
        ].some((field) =>
          field?.toString().toLowerCase().includes(searchQuery.toLowerCase()),
        );

      // Date range filtering
      let matchesDateRange = true;
      if (dateRange && (dateRange.from || dateRange.to)) {
        try {
          // Parse the date from "DD MMM, YYYY" format
          const rowDate = parse(row.arrivalDate, 'dd MMM, yyyy', new Date());

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
        matchesSupplier &&
        matchesStatus &&
        matchesDateOrder &&
        matchesSearch &&
        matchesDateRange
      );
    });
  }, [
    data,
    selectedSuppliers,
    selectedStatuses,
    selectedDateOrder,
    searchQuery,
    dateRange,
  ]);

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
            title="Product"
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

              <span className="text-xs text-muted-foreground uppercase">
                sku:{' '}
                <span className="text-xs font-medium text-secondary-foreground">
                  {productInfo.label}
                </span>
              </span>
            </div>
          );
        },
        enableSorting: true,
        size: 200,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'dateOrder',
        accessorFn: (row) => row.dateOrder,
        header: ({ column }) => (
          <DataGridColumnHeader title="Order Date" column={column} />
        ),
        cell: (info) => {
          return info.row.original.dateOrder;
        },
        enableSorting: true,
        size: 120,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'qty',
        accessorFn: (row) => row.qty,
        header: ({ column }) => (
          <DataGridColumnHeader title="QTY" column={column} />
        ),
        cell: (info) => {
          return info.row.original.qty;
        },
        enableSorting: true,
        size: 70,
        meta: {
          cellClassName: 'text-center',
        },
      },
      {
        id: 'stock',
        accessorFn: (row) => row.stock,
        header: ({ column }) => (
          <DataGridColumnHeader title="Stock" column={column} />
        ),
        cell: (info) => {
          return info.row.original.stock;
        },
        enableSorting: true,
        size: 90,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} />
        ),
        cell: (info) => {
          const status = info.row.original.status;
          const variant = status.variant as keyof BadgeProps['variant'];
          return (
            <Badge variant={variant} appearance="light">
              {status.label}
            </Badge>
          );
        },
        enableSorting: true,
        size: 110,
        meta: {
          cellClassName: 'text-center',
        },
      },
      {
        id: 'arrivalDate',
        accessorFn: (row) => row.arrivalDate,
        header: ({ column }) => (
          <DataGridColumnHeader title="Arrival Date" column={column} />
        ),
        cell: (info) => {
          return info.row.original.arrivalDate;
        },
        enableSorting: true,
        size: 120,
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
                alt="image"
              />
              <span className="leading-none text-secondary-foreground">
                {info.row.original.supplier.name}
              </span>
            </div>
          );
        },
        enableSorting: true,
        size: 140,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'carrier',
        accessorFn: (row) => row.carrier,
        header: ({ column }) => (
          <DataGridColumnHeader title="Carrier" column={column} />
        ),
        cell: (info) => {
          return info.row.original.carrier;
        },
        enableSorting: true,
        size: 90,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'tracking',
        header: ({ column }) => (
          <DataGridColumnHeader title="Tracking" column={column} />
        ),
        enableSorting: true,
        cell: (info) => (
          <>
            <div className="text-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleShowClick(info.row.original)}
              >
                Show
              </Button>
            </div>
          </>
        ),
        size: 90,
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
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Pencil />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => deleteInbound.mutate(row.original.id)}>
                <Trash />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        size: 60,
      },
    ],
    [],
  );

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
    <TooltipProvider>
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

              {/* Status Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="relative">
                    Status
                    {selectedStatuses.length > 0 && (
                      <Badge variant="outline" size="sm">
                        {selectedStatuses.length}
                      </Badge>
                    )}
                    <ChevronDown className="size-5 pt-0.5 -m-0.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search status..." />
                    <CommandList>
                      <CommandEmpty>No status found.</CommandEmpty>
                      <CommandGroup>
                        {Array.from(
                          new Set(data.map((row) => row.status?.label)),
                        ).map((status) => {
                          const count = data.filter(
                            (row) => row.status?.label === status,
                          ).length;
                          const variant =
                            (data.find((row) => row.status?.label === status)
                              ?.status?.variant as
                              | 'primary'
                              | 'secondary'
                              | 'success'
                              | 'warning'
                              | 'info'
                              | 'outline'
                              | 'destructive') || 'secondary';
                          return (
                            <CommandItem
                              key={status}
                              value={status}
                              className="flex items-center gap-2.5 bg-transparent!"
                              onSelect={() => {}}
                              data-disabled="true"
                            >
                              <Checkbox
                                id={`status-${status}`}
                                checked={selectedStatuses.includes(status)}
                                onCheckedChange={() =>
                                  handleStatusChange(
                                    !selectedStatuses.includes(status),
                                    status,
                                  )
                                }
                                size="sm"
                              />
                              <Label
                                htmlFor={`status-${status}`}
                                className="grow flex items-center justify-between font-normal gap-1.5"
                              >
                                <Badge variant={variant} appearance="light">
                                  {status}
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

              {/* Supplier Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="relative">
                    Supplier
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
                    <CommandInput placeholder="Search supplier..." />
                    <CommandList>
                      <CommandEmpty>No supplier found.</CommandEmpty>
                      <CommandGroup>
                        {Array.from(
                          new Set(data.map((row) => row.supplier)),
                        ).map((supplier) => {
                          const count = data.filter(
                            (row) => row.supplier?.name === supplier.name,
                          ).length;
                          return (
                            <CommandItem
                              key={supplier.name}
                              value={supplier.name}
                              className="flex items-center gap-2.5 bg-transparent!"
                              onSelect={() => {}}
                              data-disabled="true"
                            >
                              <Checkbox
                                id={supplier.name}
                                checked={selectedSuppliers.some(
                                  (s) => s.name === supplier.name,
                                )}
                                onCheckedChange={(checked) =>
                                  handleSupplierChange(
                                    checked === true,
                                    supplier,
                                  )
                                }
                                size="sm"
                              />
                              <Label
                                htmlFor={supplier.name}
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
              <Button variant="mono">Stock Planner</Button>
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

        {/* Track Shipping Modal */}
        <TrackShippingSheet
          open={isTrackShippingOpen}
          onOpenChange={setIsTrackShippingOpen}
          data={selectedProduct}
        />

        {/* Per Product Stock Sheet Modal */}
        <PerProductStockSheet
          open={isPerProductStockOpen}
          onOpenChange={setIsPerProductStockOpen}
          data={selectedProductForStock}
        />
      </DataGrid>
    </TooltipProvider>
  );
};

export { InboundStockTable };

import { useEffect, useMemo, useState } from 'react';
import {
  ColumnDef,
  ExpandedState,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  RowSelectionState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { EllipsisVertical, Info, SquareMinus, SquarePlus, Trash } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useT } from '@/i18n/use-t';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toAbsoluteUrl } from '@/lib/helpers';
import {
  Card,
  CardFooter,
  CardHeader,
  CardTable,
  CardToolbar,
} from '@/components/ui/card';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateShippingLabelSheet } from '../components/create-shipping-label-sheet';
import { TrackShippingSheet } from '../components/track-shipping-sheet';
import { ProductInfoSheet } from '../components/product-info-sheet';
import { OrderDetailsSheet } from '../components/order-details-sheet';
import type { VariantProps } from 'class-variance-authority';
import { Settings, Pencil } from 'lucide-react';
import { DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { isSupabaseConfigured } from '@/lib/supabase';
import { orderItemsMockData as sharedOrderItemsMockData, orderListMockData } from '@/store-inventory/data/orders';
import { useCancelOrder, useOrderItems } from '@/store-inventory/hooks/use-inventory';
import { OrderFormSheet } from '../components/order-form-sheet';

// ---- DATA TYPE ----
export interface OrderItemData {
  id: string;
  productInfo: {
    image: string;
    title: string;
    label: string;
    tooltip: string;
  };
  category: string;
  price: string;
  trends: {
    label: string;
    variant: VariantProps<typeof Badge>['variant'];
  };
  stock: number;
  reserved: number;
  thresholdLevel: number;
  supplier: {
    name: string;
    logo: string;
  };
}

export interface OrderListData {
  deliveryStatus: {
    label: string;
    variant: VariantProps<typeof Badge>['variant'];
  };
  customer: string;
  date: string;
  order: string;
  id: string;
  total: string;
  paymentStatus: {
    label: string;
    variant: VariantProps<typeof Badge>['variant'];
  };
  items: number;
  carrier: {
    name: string;
    logo: string;
  };
  category: string;
}

export type OrderListDisplaySheet = 'orderDetails' | 'orderTracking';

interface OrderListProps {
  mockData?: OrderListData[];
  displayProducts?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  displaySheet?: OrderListDisplaySheet;
  selectedOrderId?: string;
}

// ---- MOCK DATA ----
const mockData: OrderListData[] = orderListMockData;

const tabDefs = [
  { id: 'all', label: 'All' },
  { id: 'in-transit', label: 'In Transit' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'returns', label: 'Returns' },
  { id: 'canceled', label: 'Canceled' },
];

function matchesTab(row: OrderListData, tab: string) {
  const delivery = row.deliveryStatus.label.toLowerCase();
  const payment = row.paymentStatus.label.toLowerCase();
  switch (tab) {
    case 'in-transit':
      return delivery === 'shipped' || delivery === 'in transit';
    case 'delivered':
      return delivery === 'delivered';
    case 'returns':
      return delivery === 'returned';
    case 'canceled':
      return delivery === 'canceled' || delivery === 'cancelled' || payment === 'cancelled';
    default:
      return true;
  }
}

// ---- MAIN TABLE COMPONENT ----
export function OrderListTable({
  mockData: propsMockData,
  displayProducts = false,
  isLoading = false,
  isError = false,
  displaySheet,
  selectedOrderId,
}: OrderListProps) {
  const t = useT();
  const rawData = isSupabaseConfigured ? (propsMockData ?? []) : (propsMockData || mockData);
  const cancelOrder = useCancelOrder();

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expandedRows, setExpandedRows] = useState<ExpandedState>({});

  const [trackShippingSheetOpen, setTrackShippingSheetOpen] = useState(false);
  const [orderDetailsSheetOpen, setOrderDetailsSheetOpen] = useState(false);

  const [createShippingSheetOpen, setCreateShippingSheetOpen] = useState(false);

  const [productInfoSheetOpen, setProductInfoSheetOpen] = useState(false);

  const [createShippingData, setCreateShippingData] = useState<OrderListData | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderListData | null>(null);
  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [orderFormMode, setOrderFormMode] = useState<'new' | 'edit'>('edit');

  const [activeTab, setActiveTab] = useState<string>('all');

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  };

  const tabs = useMemo(
    () =>
      tabDefs.map((tab) => ({
        ...tab,
        label: t(tab.label),
        badge: rawData.filter((row) => matchesTab(row, tab.id)).length,
      })),
    [rawData, t],
  );

  const filteredData = useMemo(
    () => rawData.filter((row) => matchesTab(row, activeTab)),
    [activeTab, rawData],
  );

  useEffect(() => {
    if (displaySheet === 'orderDetails') setOrderDetailsSheetOpen(true);
    if (displaySheet === 'orderTracking') setTrackShippingSheetOpen(true);
  }, [displaySheet]);

  useEffect(() => {
    if (!rawData.length) return;
    const match = selectedOrderId
      ? rawData.find((row) => row.id === selectedOrderId)
      : rawData[0];
    if (match && displaySheet) {
      setSelectedOrder(match);
    }
  }, [selectedOrderId, rawData, displaySheet]);

  const openDetails = (row: OrderListData) => {
    setSelectedOrder(row);
    setOrderDetailsSheetOpen(true);
  };

  const openTracking = (row: OrderListData) => {
    setSelectedOrder(row);
    setTrackShippingSheetOpen(true);
  };

  const openEdit = (row: OrderListData) => {
    setSelectedOrder(row);
    setOrderFormMode('edit');
    setOrderFormOpen(true);
  };

  // Auto-expand first row when displayProducts is true
  useEffect(() => {
    if (displayProducts && filteredData.length > 0) {
      setExpandedRows({ [filteredData[0].id]: true });
    } else if (!displayProducts) {
      // Clear expanded rows when displayProducts is false
      setExpandedRows({});
    }
  }, [displayProducts, filteredData]);

  // --- COLUMNS ---
  const columns = useMemo<ColumnDef<OrderListData>[]>(
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
        id: 'order',
        accessorFn: (row) => row.order,
        header: ({ column }) => (
          <DataGridColumnHeader title="OrderId" column={column} />
        ),
        cell: (info) => (
          <Link
            to="#"
            className="text-2sm text-primary font-normal"
            onClick={(event) => {
              event.preventDefault();
              openDetails(info.row.original);
            }}
          >
            {info.row.original.order}
          </Link>
        ),
        enableSorting: true,
        size: 120,
      },
      {
        id: 'date',
        accessorFn: (row) => row.date,
        header: ({ column }) => (
          <DataGridColumnHeader title="Date" column={column} />
        ),
        cell: (info) => info.row.original.date,
        enableSorting: true,
        size: 120,
      },
      {
        id: 'customer',
        accessorFn: (row) => row.customer,
        header: ({ column }) => (
          <DataGridColumnHeader title="Customer" column={column} />
        ),
        cell: (info) => info.row.original.customer,
        enableSorting: true,
        size: 120,
      },
      {
        id: 'total',
        accessorFn: (row) => row.total,
        header: ({ column }) => (
          <DataGridColumnHeader title="Total" column={column} />
        ),
        cell: (info) => info.row.original.total,
        enableSorting: true,
        size: 100,
      },
      {
        id: 'paymentStatus',
        accessorFn: (row) => row.paymentStatus,
        header: ({ column }) => (
          <DataGridColumnHeader title="Payment Status" column={column} />
        ),
        cell: (info) => {
          const ps = info.row.original.paymentStatus;
          return (
            <Badge variant={ps.variant} appearance="light">
              {t(ps.label)}
            </Badge>
          );
        },
        enableSorting: true,
        size: 130,
      },
      {
        id: 'items',
        accessorFn: (row) => row.items,
        header: ({ column }) => (
          <DataGridColumnHeader title="Items" column={column} />
        ),
        cell: (info) => (
          <div 
            className="cursor-pointer hover:text-primary transition-colors"
            onClick={() => info.row.getToggleExpandedHandler()()}
          >
            {t('{count} items', { count: info.row.original.items })}
          </div>
        ),
        enableSorting: true,
        size: 100,
      },
      {
        id: 'deliveryStatus',
        accessorFn: (row) => row.deliveryStatus,
        header: ({ column }) => (
          <DataGridColumnHeader title="Delivery Status" column={column} />
        ),
        cell: (info) => {
          const ds = info.row.original.deliveryStatus;
          return (
            <Badge variant={ds.variant} appearance="light">
              {t(ds.label)}
            </Badge>
          );
        },
        enableSorting: true,
        size: 130,
      },
      {
        id: 'carrier',
        accessorFn: (row) => row.carrier,
        header: ({ column }) => (
          <DataGridColumnHeader title="Carrier" column={column} />
        ),
        cell: (info) => (
          <Button variant="outline" size="sm" onClick={() => setTrackShippingSheetOpen(true)}>
            <img
              src={toAbsoluteUrl(`/media/brand-logos/${info.row.original.carrier.logo}`)}
              className="h-3.5 rounded-full"
              alt={info.row.original.carrier.name}
            />
            
            {info.row.original.carrier.name}
          </Button>
        ),
        enableSorting: true,
        size: 150,
      },
      {
        id: 'actions',
        header: ({ column }) => (
          <DataGridColumnHeader title="Actions" column={column} />
        ),
        enableSorting: false,
        cell: ({row}) => (
          <div className="flex grow justify-center items-center gap-1.5">
            <Button
                className="size-6 text-muted-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  row.getToggleExpandedHandler()();
                }}
                variant="ghost" 
                mode="icon" 
                size="sm"
            >
              {row.getIsExpanded() ? <SquareMinus /> : <SquarePlus />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" mode="icon" size="sm" >
                  <EllipsisVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom">
                <DropdownMenuLabel>{t('Order Actions')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openDetails(row.original)}>
                  <Info />
                  {t('View Details')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openTracking(row.original)}>
                  <Pencil />
                  {t('Track Shipping')}
                </DropdownMenuItem>
                {displayProducts && (
                  <DropdownMenuItem onClick={() => setProductInfoSheetOpen(true)}>
                    <SquarePlus />
                    {t('View Products')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openEdit(row.original)}>
                  <Settings />
                  {t('Edit Order')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() =>
                    cancelOrder.mutate(
                      { id: row.original.id, reason: 'Canceled from order list' },
                      {
                        onSuccess: () => toast.success(t('Order canceled')),
                        onError: (error) =>
                          toast.error(error instanceof Error ? error.message : t('Unable to cancel order')),
                      },
                    )
                  }
                >
                  <Trash />
                  {t('Cancel Order')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
        size: 80,
          meta: {
           expandedContent: (row) => <OrderItemsSubTable rowData={row} />,
         },
      },
    ],
    [displayProducts, openDetails, openTracking, openEdit, cancelOrder, t],
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
      expanded: expandedRows,
    },
    getRowId: (row: OrderListData) => row.id,
    getRowCanExpand: (row) => Boolean(row.original.id),
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onExpandedChange: setExpandedRows,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <DataGrid
      table={table}
      recordCount={filteredData.length}
      tableLayout={{
        columnsPinnable: true,
        columnsMovable: true,
        columnsVisibility: true,
        cellBorder: true,
      }}
    >
      <TrackShippingSheet
        open={trackShippingSheetOpen}
        onOpenChange={setTrackShippingSheetOpen}
        orderId={selectedOrder?.id}
        order={selectedOrder ?? undefined}
      />

      <CreateShippingLabelSheet
        open={createShippingSheetOpen}
        onOpenChange={setCreateShippingSheetOpen}
        data={createShippingData ?? selectedOrder ?? undefined}
      />

      <OrderFormSheet
        mode={orderFormMode}
        open={orderFormOpen}
        onOpenChange={setOrderFormOpen}
        order={selectedOrder ?? undefined}
      />

      {productInfoSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="rounded-lg p-6 w-full mx-4 overflow-y-auto bg-[#FAFAFA]">
            <ProductInfoSheet
              mockData={[]}
            />
          </div>
        </div>
      )}

      <OrderDetailsSheet
        open={orderDetailsSheetOpen}
        onOpenChange={setOrderDetailsSheetOpen}
        orderId={selectedOrder?.id}
        order={selectedOrder ?? undefined}
        onTrackShipping={() => {
          setOrderDetailsSheetOpen(false);
          setTrackShippingSheetOpen(true);
        }}
        onViewShippingLabel={() => {
          setCreateShippingData(selectedOrder);
          setCreateShippingSheetOpen(true);
        }}
      />

      {isError && (
        <p className="text-sm text-destructive">{t('Unable to load orders. Check your connection and try again.')}</p>
      )}
      {isLoading && (
        <p className="text-sm text-muted-foreground">{t('Loading orders...')}</p>
      )}
      {!isLoading && !isError && rawData.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('No orders yet. Create your first order to get started.')}</p>
      )}

      <Card>
        <CardHeader className="py-3.5 flex-nowrap">
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="m-0 p-0 w-full"
          >
            <TabsList className="h-auto p-0 bg-transparent border-b-0 border-border rounded-none -ms-[3px] w-full">
              <div className="flex items-center gap-1 min-w-max">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={cn(
                      "relative text-foreground px-2 hover:text-primary data-[state=active]:text-primary data-[state=active]:shadow-none", 
                      activeTab === tab.id ? 'font-medium' : 'font-normal')
                    }
                  >
                    <div className="flex items-center gap-2">
                      {tab.label}
                      <Badge
                        size="sm"
                        variant={activeTab === tab.id ? 'primary' : 'outline'}
                        appearance="outline"
                        className={cn("rounded-full", activeTab === tab.id ? '' : 'bg-muted/60')}
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
            <Button
              variant="outline"
              asChild
            >
              <Link to="/store-inventory/order-details">
                {t('View Order Details')}
              </Link>
            </Button>
            <Button
              variant="mono"
              asChild
            >
              <Link to="/store-inventory/stock-planner">
                {t('Stock Planner')}
              </Link>
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
  );
}

// ---- ORDER ITEMS SUB TABLE COMPONENT ----
interface OrderItemsSubTableProps {
  rowData?: OrderListData;
}

function OrderItemsSubTable({ rowData }: OrderItemsSubTableProps) {
  const t = useT();
  const [sorting, setSorting] = useState<SortingState>([]);
  const { data: remoteItems } = useOrderItems(rowData?.id);
  const items = isSupabaseConfigured ? (remoteItems ?? []) : (remoteItems ?? sharedOrderItemsMockData);

  const columns = useMemo<ColumnDef<OrderItemData>[]>(
    () => [
      {
        id: 'productInfo',
        accessorFn: (row) => row.productInfo,
        header: ({ column }) => (
          <DataGridColumnHeader title="Product Info" column={column} />
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
                {productInfo.title.length > 20 ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className="text-sm font-medium text-foreground leading-3.5 truncate max-w-[180px] cursor-pointer hover:text-primary transition-colors"
                        >
                          {productInfo.title}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{productInfo.title}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <span
                    className="text-sm font-medium text-foreground leading-3.5 cursor-pointer hover:text-primary transition-colors"
                  >
                    {productInfo.title}
                  </span>
                )}
                <span className="text-xs text-muted-foreground uppercase">
                  {t('SKU')}:{' '}
                  <span className="text-xs font-medium text-secondary-foreground">
                    {productInfo.label}
                  </span>
                </span>
              </div>
            </div>
          );
        },
        enableSorting: true,
        size: 200,
      },
      {
        id: 'category',
        accessorFn: (row) => row.category,
        header: ({ column }) => (
          <DataGridColumnHeader title="Category" column={column} />
        ),
        cell: (info) => info.row.original.category,
        enableSorting: true,
        size: 100,
      },
      {
        id: 'price',
        accessorFn: (row) => row.price,
        header: ({ column }) => (
          <DataGridColumnHeader title="Price" column={column} />
        ),
        cell: (info) => info.row.original.price,
        enableSorting: true,
        size: 80,
      },
      {
        id: 'trends',
        accessorFn: (row) => row.trends,
        header: ({ column }) => (
          <DataGridColumnHeader title="Trends" column={column} />
        ),
        cell: (info) => {
          const trends = info.row.original.trends;
          return (
            <Badge variant={trends.variant} appearance="light">
              {t(trends.label)}
            </Badge>
          );
        },
        enableSorting: true,
        size: 100,
      },
      {
        id: 'stock',
        accessorFn: (row) => row.stock,
        header: ({ column }) => (
          <DataGridColumnHeader title="Stock" column={column} />
        ),
        cell: (info) => info.row.original.stock,
        enableSorting: true,
        size: 80,
      },
      {
        id: 'reserved',
        accessorFn: (row) => row.reserved,
        header: ({ column }) => (
          <DataGridColumnHeader title="Rsvd" column={column} />
        ),
        cell: (info) => info.row.original.reserved,
        enableSorting: true,
        size: 80,
      },
      {
        id: 'thresholdLevel',
        accessorFn: (row) => row.thresholdLevel,
        header: ({ column }) => (
          <DataGridColumnHeader title="T-Lvl" column={column} />
        ),
        cell: (info) => info.row.original.thresholdLevel,
        enableSorting: true,
        size: 80,
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
        size: 160,
      },
    ],
    [t],
  );

  const table = useReactTable({
    data: items,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row: OrderItemData) => row.id,
  });

  return (
    <div className="bg-muted/30 p-5">
      <div className="bg-card rounded-lg border border-muted-foreground/22">
        <DataGrid
          table={table}
          recordCount={items.length}
          tableLayout={{
            cellBorder: true,
            rowBorder: true,
            headerBackground: true,
            headerBorder: true,
          }}
        >
          <DataGridTable />
        </DataGrid>
      </div>
    </div>
  );
}


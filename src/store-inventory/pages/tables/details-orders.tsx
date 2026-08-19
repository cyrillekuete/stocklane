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
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toAbsoluteUrl } from '@/lib/helpers';
import { formatMoney } from '@/store-inventory/lib/format';
import {
  Card,
  CardFooter,
  CardTable,
} from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import {
  DataGridTable,
} from '@/components/ui/data-grid-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { detailsOrdersMockData } from '@/store-inventory/data/orders';
import { CreateShippingLabelSheet } from '../components/create-shipping-label-sheet';
import { TrackShippingSheet } from '../components/track-shipping-sheet';
import { ProductInfoSheet } from '../components/product-info-sheet';
import { OrderDetailsSheet } from '../components/order-details-sheet';
import type { VariantProps } from 'class-variance-authority';
import { Settings, Pencil } from 'lucide-react';
import { DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

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

export interface DetailsOrdersData {
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

interface DetailsOrdersProps {
  mockData?: DetailsOrdersData[];
  displayProducts?: boolean;
}

// ---- MOCK DATA ----
const orderItemsMockData: OrderItemData[] = [
  {
    id: '1',
    productInfo: {
      image: '11.png',
      title: 'Air Max 270 React Eng...',
      label: 'WM-8421',
      tooltip: 'Air Max 270 React Engineered - Premium sneakers with advanced cushioning technology',
    },
    category: 'Sneakers',
    price: formatMoney(83),
    trends: {
      label: 'Fast Moving',
      variant: 'success',
    },
    stock: 92,
    reserved: 5,
    thresholdLevel: 110,
    supplier: {
      name: 'SwiftStock',
      logo: 'clusterhq.svg',
    },
  },
  {
    id: '2',
    productInfo: {
      image: '10.png',
      title: 'Trail Runner Z2',
      label: 'UC-3990',
      tooltip: 'Trail Runner Z2 - High-performance outdoor running shoes with superior grip',
    },
    category: 'Outdoor',
    price: formatMoney(110),
    trends: {
      label: 'Promo',
      variant: 'info',
    },
    stock: 12,
    reserved: 3,
    thresholdLevel: 250,
    supplier: {
      name: 'NexaSource',
      logo: 'coinhodler.svg',
    },
  },
  {
    id: '3',
    productInfo: {
      image: '9.png',
      title: 'Urban Flex Knit Low...',
      label: 'KB-8820',
      tooltip: 'Urban Flex Knit Low - Comfortable urban running shoes with flexible knit upper',
    },
    category: 'Runners',
    price: formatMoney(76.5),
    trends: {
      label: 'Clearance',
      variant: 'warning',
    },
    stock: 47,
    reserved: 9,
    thresholdLevel: 40,
    supplier: {
      name: 'CoreMart',
      logo: 'infography.svg',
    },
  },
  {
    id: '4',
    productInfo: {
      image: '8.png',
      title: 'Blaze Street Classic',
      label: 'LS-1033',
      tooltip: 'Blaze Street Classic - Timeless street style sneakers with modern comfort',
    },
    category: 'Sneakers',
    price: formatMoney(69.99),
    trends: {
      label: 'Slow Moving',
      variant: 'destructive',
    },
    stock: 0,
    reserved: 0,
    thresholdLevel: 100,
    supplier: {
      name: 'StockLab',
      logo: 'clusterhq.svg',
    },
  },
];

const mockData: DetailsOrdersData[] = detailsOrdersMockData;
// ---- MAIN TABLE COMPONENT ----
export function DetailsOrdersTable({ mockData: propsMockData, displayProducts = false }: DetailsOrdersProps & { displayProducts?: boolean }) {
  const rawData = propsMockData || mockData;

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 6,
  });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expandedRows, setExpandedRows] = useState<ExpandedState>({});

  const [trackShippingSheetOpen, setTrackShippingSheetOpen] = useState(false);
  const [orderDetailsSheetOpen, setOrderDetailsSheetOpen] = useState(false);

  const [createShippingSheetOpen, setCreateShippingSheetOpen] = useState(false);

  const [productInfoSheetOpen, setProductInfoSheetOpen] = useState(false);

  const [createModalData] = useState<DetailsOrdersData | null>(null);

  // --- DATA ---
  const filteredData = rawData;

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
  const columns = useMemo<ColumnDef<DetailsOrdersData>[]>(
    () => [
      {
        id: 'order',
        accessorFn: (row) => row.order,
        header: ({ column }) => (
          <DataGridColumnHeader title="OrderID" column={column} />
        ),
        cell: (info) => (
          <Link to="#" className="text-2sm text-primary font-normal" onClick={() => setOrderDetailsSheetOpen(true)}>
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
          <DataGridColumnHeader title="Payment St." column={column} />
        ),
        cell: (info) => {
          const ps = info.row.original.paymentStatus;
          return (
            <Badge variant={ps.variant} appearance="light">
              {ps.label}
            </Badge>
          );
        },
        enableSorting: true,
        size: 100,
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
            {info.row.original.items} items
          </div>
        ),
        enableSorting: true,
        size: 100,
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
        size: 140,
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
                <DropdownMenuLabel>Order Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setOrderDetailsSheetOpen(true)}>
                  <Info />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTrackShippingSheetOpen(true)}>
                  <Pencil />
                  Track Shipping
                </DropdownMenuItem>
                {displayProducts && (
                  <DropdownMenuItem onClick={() => setProductInfoSheetOpen(true)}>
                    <SquarePlus />
                    View Products
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings />
                  Edit Order
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive">
                  <Trash />
                  Cancel Order
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
        size: 80,
          meta: {
           expandedContent: (row) => <OrderListTable rowData={row} />,
         },
      },
    ],
    [displayProducts],
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
    getRowId: (row: DetailsOrdersData) => row.id,
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
      />

      {createModalData && (
        <CreateShippingLabelSheet
          open={createShippingSheetOpen}
          onOpenChange={setCreateShippingSheetOpen}
          data={createModalData}
        />
      )}

      {productInfoSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="rounded-lg p-6 w-full mx-4 overflow-y-auto bg-[#FAFAFA]">
            <ProductInfoSheet
              mockData={[]}
            />
          </div>
        </div>
      )}

      {orderDetailsSheetOpen && (
        <OrderDetailsSheet
          open={orderDetailsSheetOpen}
          onOpenChange={setOrderDetailsSheetOpen}
          onTrackShipping={() => {
            setOrderDetailsSheetOpen(false);
            setTrackShippingSheetOpen(true);
          }}
        />
      )}

      <Card>

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
interface OrderListTableProps {
  rowData?: unknown;
}

function OrderListTable({}: OrderListTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

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
                  sku:{' '}
                  <span className="text-xs font-medium text-secondary-foreground">
                    {productInfo.label}
                  </span>
                </span>
              </div>
            </div>
          );
        },
        enableSorting: true,
        size: 250,
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
              {trends.label}
            </Badge>
          );
        },
        enableSorting: true,
        size: 125,
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
    [],
  );

  const table = useReactTable({
    data: orderItemsMockData,
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
      <div className="bg-card rounded-lg border border-muted-foreground/22 overflow-x-auto">
        <DataGrid
          table={table}
          recordCount={orderItemsMockData.length}
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


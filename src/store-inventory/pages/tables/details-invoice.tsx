import { useEffect, useMemo, useState } from 'react';
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
import { Download, EllipsisVertical, Info, Trash } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useT } from '@/i18n/use-t';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { detailsInvoiceMockData } from '@/store-inventory/data/orders';
import { CreateShippingLabelSheet } from '../components/create-shipping-label-sheet';
import { TrackShippingSheet } from '../components/track-shipping-sheet';
import { OrderDetailsSheet } from '../components/order-details-sheet';
import type { VariantProps } from 'class-variance-authority';
import { Settings, Pencil } from 'lucide-react';
import { DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

// ---- DATA TYPE ----

export interface DetailsInvoiceData {
  invoice: string;
  date: string;
  dueDate: string;
  id: string;
  total: string;
  paymentStatus: {
    label: string;
    variant: VariantProps<typeof Badge>['variant'];
  };
}

interface DetailsInvoiceProps {
  mockData?: DetailsInvoiceData[];
  displayProducts?: boolean;
}


const mockData: DetailsInvoiceData[] = detailsInvoiceMockData;
// ---- MAIN TABLE COMPONENT ----
export function DetailsInvoiceTable({ mockData: propsMockData, displayProducts = false }: DetailsInvoiceProps & { displayProducts?: boolean }) {
  const t = useT();
  const rawData = propsMockData || mockData;

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);

  const [trackShippingSheetOpen, setTrackShippingSheetOpen] = useState(false);
  const [orderDetailsSheetOpen, setOrderDetailsSheetOpen] = useState(false);

  const [createShippingSheetOpen, setCreateShippingSheetOpen] = useState(false);


  const [createModalData] = useState<DetailsInvoiceData | null>(null);

  // Use raw data directly without filtering
  const filteredData = rawData;


  // --- COLUMNS ---
  const columns = useMemo<ColumnDef<DetailsInvoiceData>[]>(
    () => [
      {
        id: 'invoice',
        accessorFn: (row) => row.invoice,
        header: ({ column }) => (
          <DataGridColumnHeader title="InvoiceID" column={column} />
        ),
        cell: (info) => (
          <Link to="#" className="text-2sm text-primary font-normal" onClick={() => setOrderDetailsSheetOpen(true)}>
            {info.row.original.invoice}
          </Link>
        ),
        enableSorting: true,
        size: 100,
      },
      {
        id: 'date',
        accessorFn: (row) => row.date,
        header: ({ column }) => (
          <DataGridColumnHeader title="Date" column={column} />
        ),
        cell: (info) => info.row.original.date,
        enableSorting: true,
        size: 110,
      },
      {
        id: 'dueDate',
        accessorFn: (row) => row.dueDate,
        header: ({ column }) => (
          <DataGridColumnHeader title="Due Date" column={column} />
        ),
        cell: (info) => info.row.original.dueDate,
        enableSorting: true,
        size: 110,
      },
      {
        id: 'total',
        accessorFn: (row) => row.total,
        header: ({ column }) => (
          <DataGridColumnHeader title="Total" column={column} />
        ),
        cell: (info) => info.row.original.total,
        enableSorting: true,
        size: 90,
      },
      {
        id: 'paymentStatus',
        accessorFn: (row) => row.paymentStatus,
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} />
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
        size: 80,
      },
      {
        id: 'actions',
        header: ({ column }) => (
          <DataGridColumnHeader title="" column={column} />
        ),
        enableSorting: false,
        cell: () => (
          <div className="flex grow justify-center items-center gap-1.5">
              <Button
                 variant="ghost"
                 size="sm"
                 onClick={handleView}
                 title={t('View category')}
               >
                 <Download />
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
                <DropdownMenuItem onClick={() => setOrderDetailsSheetOpen(true)}>
                  <Info />
                  {t('View Details')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTrackShippingSheetOpen(true)}>
                  <Pencil />
                  {t('Track Shipping')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings />
                  {t('Edit Order')}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive">
                  <Trash />
                  {t('Cancel Order')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
        size: 60,
      },
    ],
    [displayProducts, t],
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
    getRowId: (row: DetailsInvoiceData) => row.id,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
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


function handleView(): void {
  throw new Error('Function not implemented.');
}


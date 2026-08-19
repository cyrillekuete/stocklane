'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Eye, Search, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardHeader, CardHeading, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Input, InputWrapper } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { usePosSales, useVoidPosSale } from '@/store-inventory/hooks/use-pos';
import { useStoreSettings } from '@/store-inventory/hooks/use-settings';
import { APP_CURRENCY, formatMoney } from '@/store-inventory/lib/format';
import { formatPaymentMethod } from '@/store-inventory/lib/payment-methods';
import { formatSaleWarehouses } from '@/store-inventory/services/pos';
import type { PosSaleRow } from '@/store-inventory/types';
import {
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { PosReceiptDialog } from '../components/pos-receipt-dialog';

export function PosSalesTable({ mockData }: { mockData?: PosSaleRow[] }) {
  const data = mockData ?? [];
  const voidSale = useVoidPosSale();
  const settings = useStoreSettings();
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [selected, setSelected] = useState<PosSaleRow | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data;
    return data.filter((row) =>
      [row.saleNumber, row.customerName, formatSaleWarehouses(row), formatPaymentMethod(row.paymentMethod)].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [data, search]);

  const columns = useMemo<ColumnDef<PosSaleRow>[]>(
    () => [
      {
        id: 'saleNumber',
        accessorFn: (row) => row.saleNumber,
        header: ({ column }) => <DataGridColumnHeader title="Sale" column={column} />,
        cell: ({ row }) => <span className="font-medium">{row.original.saleNumber}</span>,
        size: 120,
      },
      {
        id: 'createdAt',
        accessorFn: (row) => row.createdAt,
        header: ({ column }) => <DataGridColumnHeader title="Date" column={column} />,
        cell: ({ row }) => format(new Date(row.original.createdAt), 'd MMM yyyy, HH:mm'),
        size: 150,
      },
      {
        id: 'warehouseName',
        accessorFn: (row) => formatSaleWarehouses(row),
        header: ({ column }) => <DataGridColumnHeader title="Warehouse" column={column} />,
        cell: ({ row }) => <span>{formatSaleWarehouses(row.original)}</span>,
        size: 180,
      },
      {
        id: 'customerName',
        accessorFn: (row) => row.customerName,
        header: ({ column }) => <DataGridColumnHeader title="Customer" column={column} />,
        size: 140,
      },
      {
        id: 'total',
        accessorFn: (row) => row.total,
        header: ({ column }) => <DataGridColumnHeader title="Total" column={column} />,
        cell: ({ row }) => formatMoney(row.original.total),
        size: 90,
      },
      {
        id: 'paymentMethod',
        accessorFn: (row) => row.paymentMethod,
        header: ({ column }) => <DataGridColumnHeader title="Payment" column={column} />,
        cell: ({ row }) => formatPaymentMethod(row.original.paymentMethod),
        size: 150,
      },
      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: ({ column }) => <DataGridColumnHeader title="Status" column={column} />,
        cell: ({ row }) => (
          <Badge
            variant={(row.original.status === 'completed' ? 'success' : 'destructive') as BadgeProps['variant']}
            appearance="light"
          >
            {row.original.status}
          </Badge>
        ),
        size: 100,
      },
      {
        id: 'actions',
        enableSorting: false,
        header: () => '',
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="dim"
              mode="icon"
              size="sm"
              onClick={() => {
                setSelected(row.original);
                setReceiptOpen(true);
              }}
            >
              <Eye />
            </Button>
            {row.original.status === 'completed' && (
              <Button
                variant="dim"
                mode="icon"
                size="sm"
                onClick={() => {
                  voidSale.mutate(row.original.id, {
                    onSuccess: () => toast.success('Sale voided and stock restored'),
                    onError: (error) =>
                      toast.error(error instanceof Error ? error.message : 'Unable to void sale'),
                  });
                }}
              >
                <Undo2 />
              </Button>
            )}
          </div>
        ),
        size: 90,
      },
    ],
    [voidSale],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <>
      <DataGrid table={table} recordCount={filtered.length} tableLayout={{ cellBorder: true }}>
        <Card>
          <CardHeader className="py-3.5">
            <CardHeading>
              <div className="w-full max-w-[240px]">
                <InputWrapper>
                  <Search />
                  <Input placeholder="Search sales..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </InputWrapper>
              </div>
            </CardHeading>
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
      <PosReceiptDialog
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        sale={selected}
        storeName={settings.data?.storeName ?? 'Store'}
        currency={settings.data?.currency ?? APP_CURRENCY}
      />
    </>
  );
}

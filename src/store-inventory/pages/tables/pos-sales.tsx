'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Eye, Search, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/i18n/use-t';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardHeader, CardHeading, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Input, InputWrapper } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useVoidPosSale } from '@/store-inventory/hooks/use-pos';
import { useStoreSettings } from '@/store-inventory/hooks/use-settings';
import { APP_CURRENCY, formatMoney } from '@/store-inventory/lib/format';
import { formatPaymentMethod } from '@/store-inventory/lib/payment-methods';
import {
  formatPosError,
  formatSaleWarehouses,
  isPosSaleVoidable,
  POS_VOID_MAX_AGE_DAYS,
} from '@/store-inventory/services/pos';
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
  const t = useT();
  const data = mockData ?? [];
  const voidSale = useVoidPosSale();
  const settings = useStoreSettings();
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [selected, setSelected] = useState<PosSaleRow | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<PosSaleRow | null>(null);
  const [voidReason, setVoidReason] = useState('');

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
        cell: ({ row }) => t(formatPaymentMethod(row.original.paymentMethod)),
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
            {t(row.original.status)}
          </Badge>
        ),
        size: 100,
      },
      {
        id: 'actions',
        enableSorting: false,
        header: () => '',
        cell: ({ row }) => {
          const sale = row.original;
          const canVoid = isPosSaleVoidable(sale);
          return (
            <div className="flex justify-end gap-1">
              <Button
                variant="dim"
                mode="icon"
                size="sm"
                onClick={() => {
                  setSelected(sale);
                  setReceiptOpen(true);
                }}
              >
                <Eye />
              </Button>
              {sale.status === 'completed' && (
                <Button
                  variant="dim"
                  mode="icon"
                  size="sm"
                  disabled={!canVoid || voidSale.isPending}
                  title={
                    canVoid
                      ? t('Void sale')
                      : t('Sales older than {days} days cannot be voided', { days: POS_VOID_MAX_AGE_DAYS })
                  }
                  onClick={() => {
                    setVoidTarget(sale);
                    setVoidReason('');
                  }}
                >
                  <Undo2 />
                </Button>
              )}
            </div>
          );
        },
        size: 90,
      },
    ],
    [voidSale.isPending, t],
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

  const handleConfirmVoid = () => {
    if (!voidTarget) return;
    const reason = voidReason.trim();
    voidSale.mutate(
      { saleId: voidTarget.id, reason: reason || undefined },
      {
        onSuccess: () => {
          toast.success(t('Sale voided and stock restored'));
          setVoidTarget(null);
          setVoidReason('');
        },
        onError: (error) => toast.error(t(formatPosError(error))),
      },
    );
  };

  return (
    <>
      <DataGrid table={table} recordCount={filtered.length} tableLayout={{ cellBorder: true }}>
        <Card>
          <CardHeader className="py-3.5">
            <CardHeading>
              <div className="w-full max-w-[240px]">
                <InputWrapper>
                  <Search />
                  <Input placeholder={t('Search sales...')} value={search} onChange={(e) => setSearch(e.target.value)} />
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
        storeName={settings.data?.storeName ?? t('Store')}
        currency={settings.data?.currency ?? APP_CURRENCY}
      />
      <AlertDialog
        open={Boolean(voidTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setVoidTarget(null);
            setVoidReason('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('Void sale {saleNumber}?', { saleNumber: voidTarget?.saleNumber ?? '' })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {voidTarget && (voidTarget.paymentMethod === 'account' || voidTarget.paymentMethod === 'credit')
                ? t(
                    'This restores warehouse stock and reverses the customer account charge. Total {total}. Voids are limited to {days} days.',
                    { total: formatMoney(voidTarget.total), days: POS_VOID_MAX_AGE_DAYS },
                  )
                : t('This restores warehouse stock. Total {total}. Voids are limited to {days} days.', {
                    total: voidTarget ? formatMoney(voidTarget.total) : '',
                    days: POS_VOID_MAX_AGE_DAYS,
                  })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 px-1">
            <Label htmlFor="void-reason">{t('Reason (optional)')}</Label>
            <Textarea
              id="void-reason"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              rows={2}
              placeholder={t('Wrong items, customer cancelled, …')}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={voidSale.isPending}>{t('Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                event.preventDefault();
                handleConfirmVoid();
              }}
              disabled={voidSale.isPending}
            >
              {t('Void sale')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

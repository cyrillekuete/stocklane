'use client';

import { useMemo, useState } from 'react';
import { Pencil, Search, Star, Trash } from 'lucide-react';
import { toast } from 'sonner';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useT } from '@/i18n/use-t';
import {
  useActiveWarehouses,
  useDeleteWarehouse,
  useMoveWarehouseStock,
} from '@/store-inventory/hooks/use-warehouses';
import { mapWarehouseError } from '@/store-inventory/lib/warehouse-errors';
import { getWarehouseDeleteBlockers } from '@/store-inventory/services/warehouses';
import type { WarehouseListRow } from '@/store-inventory/types';
import {
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { WarehouseFormSheet } from '../components/warehouse-form-sheet';

export function WarehouseListTable({ mockData }: { mockData?: WarehouseListRow[] }) {
  const t = useT();
  const data = mockData ?? [];
  const deleteWarehouse = useDeleteWarehouse();
  const moveStock = useMoveWarehouseStock();
  const { data: activeWarehouses } = useActiveWarehouses();
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [editRow, setEditRow] = useState<WarehouseListRow | undefined>();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<WarehouseListRow | undefined>();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteSummary, setDeleteSummary] = useState<string[]>([]);
  const [moveTargetId, setMoveTargetId] = useState('');

  const moveTargets = useMemo(
    () => (activeWarehouses ?? []).filter((row) => row.id !== deleteRow?.id),
    [activeWarehouses, deleteRow?.id],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data;
    return data.filter((row) =>
      [row.name, row.code, row.city, row.country].some((value) => value?.toLowerCase().includes(query)),
    );
  }, [data, search]);

  const openDeleteConfirm = async (row: WarehouseListRow) => {
    try {
      const blockers = await getWarehouseDeleteBlockers(row.id);
      setDeleteRow(row);
      setDeleteSummary(
        blockers.messages.length
          ? blockers.messages
          : [t('Delete {name}? This cannot be undone.', { name: row.name })],
      );
      const targets = (activeWarehouses ?? []).filter((item) => item.id !== row.id);
      if (blockers.hasStock && targets[0]) {
        setMoveTargetId(targets[0].id);
      } else {
        setMoveTargetId('');
      }
      setConfirmDeleteOpen(true);
    } catch (error) {
      toast.error(t(mapWarehouseError(error).message));
    }
  };

  const handleMoveStock = async () => {
    if (!deleteRow || !moveTargetId) {
      toast.error(t('Select a destination warehouse'));
      return;
    }
    try {
      const moved = await moveStock.mutateAsync({
        fromWarehouseId: deleteRow.id,
        toWarehouseId: moveTargetId,
      });
      toast.success(t('Moved {count} units to the selected warehouse', { count: moved }));
      const blockers = await getWarehouseDeleteBlockers(deleteRow.id);
      setDeleteSummary(
        blockers.messages.length
          ? blockers.messages
          : [t('Stock moved. You can delete {name} now.', { name: deleteRow.name })],
      );
    } catch (error) {
      toast.error(t(mapWarehouseError(error).message));
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteRow) return;
    try {
      const blockers = await getWarehouseDeleteBlockers(deleteRow.id);
      if (blockers.messages.length) {
        setDeleteSummary(blockers.messages);
        toast.error(t(blockers.messages[0]));
        return;
      }
      await deleteWarehouse.mutateAsync(deleteRow.id);
      toast.success(t('Warehouse deleted'));
      setConfirmDeleteOpen(false);
      setDeleteRow(undefined);
    } catch (error) {
      toast.error(mapWarehouseError(error).message);
    }
  };

  const columns = useMemo<ColumnDef<WarehouseListRow>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (row) => row.name,
        header: ({ column }) => <DataGridColumnHeader title="Warehouse" column={column} />,
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">{row.original.name}</span>
            <span className="text-xs text-muted-foreground">{row.original.code}</span>
          </div>
        ),
        size: 180,
      },
      {
        id: 'location',
        accessorFn: (row) => [row.city, row.country].filter(Boolean).join(', '),
        header: ({ column }) => <DataGridColumnHeader title="Location" column={column} />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {[row.original.city, row.original.country].filter(Boolean).join(', ') || '—'}
          </span>
        ),
        size: 140,
      },
      {
        id: 'onHand',
        accessorFn: (row) => row.onHand,
        header: ({ column }) => <DataGridColumnHeader title="On Hand" column={column} />,
        cell: ({ row }) => <span>{row.original.onHand}</span>,
        size: 80,
      },
      {
        id: 'skuCount',
        accessorFn: (row) => row.skuCount,
        header: ({ column }) => <DataGridColumnHeader title="SKUs" column={column} />,
        cell: ({ row }) => <span>{row.original.skuCount}</span>,
        size: 70,
      },
      {
        id: 'status',
        accessorFn: (row) => row.status.label,
        header: ({ column }) => <DataGridColumnHeader title="Status" column={column} />,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Badge variant={row.original.status.variant as BadgeProps['variant']} appearance="light">
              {t(row.original.status.label)}
            </Badge>
            {row.original.isDefault && (
              <Badge variant="info" appearance="light">
                <Star className="size-3" />
                {t('Default')}
              </Badge>
            )}
          </div>
        ),
        size: 140,
      },
      {
        id: 'actions',
        header: () => '',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="dim"
              mode="icon"
              size="sm"
              onClick={() => {
                setEditRow(row.original);
                setEditOpen(true);
              }}
            >
              <Pencil />
            </Button>
            <Button
              variant="dim"
              mode="icon"
              size="sm"
              onClick={() => {
                void openDeleteConfirm(row.original);
              }}
            >
              <Trash />
            </Button>
          </div>
        ),
        size: 80,
      },
    ],
    [activeWarehouses, t],
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

  const pending = deleteWarehouse.isPending || moveStock.isPending;

  return (
    <>
      <DataGrid
        table={table}
        recordCount={filtered.length}
        tableLayout={{ columnsPinnable: true, cellBorder: true }}
      >
        <Card>
          <CardHeader className="py-3.5">
            <CardHeading>
              <div className="w-full max-w-[240px]">
                <InputWrapper>
                  <Search />
                  <Input placeholder={t('Search warehouses...')} value={search} onChange={(e) => setSearch(e.target.value)} />
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
      <WarehouseFormSheet mode="edit" open={editOpen} onOpenChange={setEditOpen} warehouse={editRow} />

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete warehouse')}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                {deleteSummary.map((message) => (
                  <p key={message}>{t(message)}</p>
                ))}
                {deleteRow && deleteRow.onHand > 0 && moveTargets.length > 0 ? (
                  <div className="space-y-2 pt-2">
                    <Label>{t('Move all stock to')}</Label>
                    <Select value={moveTargetId} onValueChange={setMoveTargetId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('Destination warehouse')} />
                      </SelectTrigger>
                      <SelectContent>
                        {moveTargets.map((row) => (
                          <SelectItem key={row.id} value={row.id}>
                            {row.name} ({row.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={handleMoveStock} disabled={pending || !moveTargetId}>
                      {t('Move all stock')}
                    </Button>
                  </div>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmDelete} disabled={pending}>
              {t('Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

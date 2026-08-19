'use client';

import { useMemo, useState } from 'react';
import { Pencil, Search, Star, Trash } from 'lucide-react';
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
import { useDeleteWarehouse } from '@/store-inventory/hooks/use-warehouses';
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
  const data = mockData ?? [];
  const deleteWarehouse = useDeleteWarehouse();
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [editRow, setEditRow] = useState<WarehouseListRow | undefined>();
  const [editOpen, setEditOpen] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data;
    return data.filter((row) =>
      [row.name, row.code, row.city, row.country].some((value) => value?.toLowerCase().includes(query)),
    );
  }, [data, search]);

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
              {row.original.status.label}
            </Badge>
            {row.original.isDefault && (
              <Badge variant="info" appearance="light">
                <Star className="size-3" />
                Default
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
                deleteWarehouse.mutate(row.original.id, {
                  onSuccess: () => toast.success('Warehouse deleted'),
                  onError: (error) =>
                    toast.error(error instanceof Error ? error.message : 'Unable to delete warehouse'),
                });
              }}
            >
              <Trash />
            </Button>
          </div>
        ),
        size: 80,
      },
    ],
    [deleteWarehouse],
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
                  <Input placeholder="Search warehouses..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
    </>
  );
}

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
import {
  Eye,
  Info,
  Search,
  SquarePen,
  Trash,
  ChevronUp,
  Copy,
  Download,
  Link,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { toAbsoluteUrl } from '@/lib/helpers';
import { isSupabaseConfigured } from '@/lib/supabase';
import { isRemoteAsset } from '@/store-inventory/lib/format';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
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
import { Badge, BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Input, InputWrapper } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { customerListMockData } from '@/store-inventory/data/customers';
import { CustomerDetailsSheet } from '../components/customer-details-sheet';
import { CustomerFormSheet } from '../components/customer-form-sheet';
import { Avatar, AvatarImage, AvatarFallback, AvatarIndicator, AvatarStatus } from '@/components/ui/avatar';
import { VariantProps } from 'class-variance-authority';
import { Separator } from '@/components/ui/separator';
import {
  useDeleteCustomer,
  useDeleteCustomers,
  useDuplicateCustomers,
  useUpdateCustomersStatus,
} from '@/store-inventory/hooks/use-inventory';
import type { CustomerListRow } from '@/store-inventory/types';

interface IColumnFilterProps<TData, TValue> {
  column: Column<TData, TValue>;
}

export type IData = CustomerListRow;
export type CustomerListDisplaySheet = 'customerDetails' | 'createCustomer' | 'editCustomer';

interface CustomerListProps {
  mockData?: CustomerListRow[];
  isLoading?: boolean;
  isError?: boolean;
  displaySheet?: CustomerListDisplaySheet;
  shouldOpenSheet?: boolean;
  selectedCustomerId?: string;
  onSheetClose?: () => void;
  onSelectedRowsChange?: (customers: CustomerListRow[]) => void;
}

function avatarSrc(image?: string) {
  if (!image) return toAbsoluteUrl('/media/avatars/300-13.png');
  if (isRemoteAsset(image)) return image;
  return toAbsoluteUrl(`/media/avatars/${image}`);
}

const CustomerAvatar = ({
  image,
  statusColor,
  verified,
}: {
  image: string;
  statusColor?: VariantProps<typeof AvatarStatus>['variant'];
  verified?: boolean;
}) => {
  return (
    <Avatar>
      <AvatarImage src={image} alt="Customer" />
      <AvatarFallback>CH</AvatarFallback>
      {verified ? (
        <AvatarIndicator className="end-0.5 top-0.5">
          <div className="absolute -top-1 -right-1 size-3.5 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 15 16" fill="none" className="text-blue-500">
              <path d="M14.5425 6.89749L13.5 5.83999C13.4273 5.76877 13.3699 5.6835 13.3312 5.58937C13.2925 5.49525 13.2734 5.39424 13.275 5.29249V3.79249C13.274 3.58699 13.2324 3.38371 13.1527 3.19432C13.0729 3.00494 12.9565 2.83318 12.8101 2.68892C12.6638 2.54466 12.4904 2.43073 12.2998 2.35369C12.1093 2.27665 11.9055 2.23801 11.7 2.23999H10.2C10.0982 2.24159 9.99722 2.22247 9.9031 2.18378C9.80898 2.1451 9.72371 2.08767 9.65249 2.01499L8.60249 0.957487C8.30998 0.665289 7.91344 0.50116 7.49999 0.50116C7.08654 0.50116 6.68999 0.665289 6.39749 0.957487L5.33999 1.99999C5.26876 2.07267 5.1835 2.1301 5.08937 2.16879C4.99525 2.20747 4.89424 2.22659 4.79249 2.22499H3.29249C3.08699 2.22597 2.88371 2.26754 2.69432 2.34731C2.50494 2.42709 2.33318 2.54349 2.18892 2.68985C2.04466 2.8362 1.93073 3.00961 1.85369 3.20013C1.77665 3.39064 1.73801 3.5945 1.73999 3.79999V5.29999C1.74159 5.40174 1.72247 5.50275 1.68378 5.59687C1.6451 5.691 1.58767 5.77627 1.51499 5.84749L0.457487 6.89749C0.165289 7.19 0.00115967 7.58654 0.00115967 7.99999C0.00115967 8.41344 0.165289 8.80998 0.457487 9.10249L1.49999 10.16C1.57267 10.2312 1.6301 10.3165 1.66878 10.4106C1.70747 10.5047 1.72659 10.6057 1.72499 10.7075V12.2075C1.72597 12.413 1.76754 12.6163 1.84731 12.8056C1.92709 12.995 2.04349 13.1668 2.18985 13.3111C2.3362 13.4553 2.50961 13.5692 2.70013 13.6463C2.89064 13.7233 3.0945 13.762 3.29999 13.76H4.79999C4.90174 13.7584 5.00275 13.7775 5.09687 13.8162C5.191 13.8549 5.27627 13.9123 5.34749 13.985L6.40499 15.0425C6.69749 15.3347 7.09404 15.4988 7.50749 15.4988C7.92094 15.4988 8.31748 15.3347 8.60999 15.0425L9.65999 14C9.73121 13.9273 9.81647 13.8699 9.9106 13.8312C10.0047 13.7925 10.1057 13.7734 10.2075 13.775H11.7075C12.1212 13.775 12.518 13.6106 12.8106 13.3181C13.1031 13.0255 13.2675 12.6287 13.2675 12.215V10.715C13.2659 10.6132 13.285 10.5122 13.3237 10.4181C13.3624 10.324 13.4198 10.2387 13.4925 10.1675L14.55 9.10999C14.6953 8.96452 14.8104 8.79176 14.8887 8.60164C14.9671 8.41152 15.007 8.20779 15.0063 8.00218C15.0056 7.79656 14.9643 7.59311 14.8847 7.40353C14.8051 7.21394 14.6888 7.04197 14.5425 6.89749ZM10.635 6.64999L6.95249 10.25C6.90055 10.3026 6.83864 10.3443 6.77038 10.3726C6.70212 10.4009 6.62889 10.4153 6.55499 10.415C6.48062 10.4139 6.40719 10.3982 6.33896 10.3685C6.27073 10.3389 6.20905 10.2961 6.15749 10.2425L4.37999 8.44249C4.32532 8.39044 4.28169 8.32793 4.25169 8.25867C4.22169 8.18941 4.20593 8.11482 4.20536 8.03934C4.20479 7.96387 4.21941 7.88905 4.24836 7.81934C4.27731 7.74964 4.31999 7.68647 4.37387 7.63361C4.42774 7.58074 4.4917 7.53926 4.56194 7.51163C4.63218 7.484 4.70726 7.47079 4.78271 7.47278C4.85816 7.47478 4.93244 7.49194 5.00112 7.52324C5.0698 7.55454 5.13148 7.59935 5.18249 7.65499L6.56249 9.05749L9.84749 5.84749C9.95296 5.74215 10.0959 5.68298 10.245 5.68298C10.394 5.68298 10.537 5.74215 10.6425 5.84749C10.6953 5.90034 10.737 5.96318 10.7653 6.03234C10.7935 6.1015 10.8077 6.1756 10.807 6.25031C10.8063 6.32502 10.7908 6.39884 10.7612 6.46746C10.7317 6.53608 10.6888 6.59813 10.635 6.64999Z" fill="currentColor"/>
            </svg>
          </div>
        </AvatarIndicator>
      ) : (
        <AvatarIndicator className="-end-1.5 -top-1.5">
          <AvatarStatus variant={statusColor} className="size-2.5" />
        </AvatarIndicator>
      )}
    </Avatar>
  );
};

function successToast(message: string) {
  toast.custom(
    (t) => (
      <Alert variant="mono" icon="success" onClose={() => toast.dismiss(t)}>
        <AlertIcon>
          <Info />
        </AlertIcon>
        <AlertTitle>{message}</AlertTitle>
      </Alert>
    ),
    { duration: 5000 },
  );
}

export function CustomerListTable({
  mockData: propsMockData,
  isLoading = false,
  isError = false,
  displaySheet,
  shouldOpenSheet,
  selectedCustomerId,
  onSheetClose,
  onSelectedRowsChange,
}: CustomerListProps) {
  const data = isSupabaseConfigured ? (propsMockData ?? []) : (propsMockData || customerListMockData);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isCustomerSheetOpen, setIsCustomerSheetOpen] = useState(false);
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
  const [customerFormMode, setCustomerFormMode] = useState<'new' | 'edit'>('new');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerListRow | undefined>();
  const [customerToDelete, setCustomerToDelete] = useState<CustomerListRow | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isGroupDeleteDialogOpen, setIsGroupDeleteDialogOpen] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([{ id: 'updated', desc: true }]);

  const deleteCustomer = useDeleteCustomer();
  const deleteCustomers = useDeleteCustomers();
  const updateStatus = useUpdateCustomersStatus();
  const duplicateCustomers = useDuplicateCustomers();

  useEffect(() => {
    if (displaySheet === 'createCustomer' && shouldOpenSheet !== false) {
      setCustomerFormMode('new');
      setSelectedCustomer(undefined);
      setIsCustomerFormOpen(true);
    }
  }, [displaySheet, shouldOpenSheet]);

  useEffect(() => {
    if (!data.length) return;
    const match = selectedCustomerId
      ? data.find((customer) => customer.id === selectedCustomerId)
      : displaySheet === 'customerDetails' || displaySheet === 'editCustomer'
        ? data[0]
        : undefined;
    if (!match) return;
    setSelectedCustomer(match);
    if (displaySheet === 'customerDetails' && shouldOpenSheet !== false) {
      setIsCustomerSheetOpen(true);
    }
    if (displaySheet === 'editCustomer' && shouldOpenSheet !== false) {
      setCustomerFormMode('edit');
      setIsCustomerFormOpen(true);
    }
  }, [selectedCustomerId, data, displaySheet, shouldOpenSheet]);

  const handleOpenCustomerDetails = (customer: CustomerListRow) => {
    setSelectedCustomer(customer);
    setIsCustomerSheetOpen(true);
  };

  const handleOpenCustomerForm = (mode: 'new' | 'edit', customer?: CustomerListRow) => {
    setCustomerFormMode(mode);
    setSelectedCustomer(customer);
    setIsCustomerFormOpen(true);
  };

  const selectedRows = useMemo(
    () => data.filter((customer) => rowSelection[customer.id]),
    [data, rowSelection],
  );

  useEffect(() => {
    onSelectedRowsChange?.(selectedRows);
  }, [selectedRows, onSelectedRowsChange]);

  const handleConfirmDelete = () => {
    if (!customerToDelete) return;
    deleteCustomer.mutate(customerToDelete.id, {
      onSuccess: () => {
        successToast(`Customer "${customerToDelete.customerInfo.title}" deleted successfully`);
        setCustomerToDelete(null);
        setIsDeleteDialogOpen(false);
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : 'Unable to delete customer');
      },
    });
  };

  const handleGroupStatusChange = (status: string) => {
    const ids = selectedRows.map((customer) => customer.id);
    if (!ids.length) return;
    updateStatus.mutate(
      { ids, status },
      {
        onSuccess: () => {
          successToast(`Status updated to ${status} for ${ids.length} customers`);
          setRowSelection({});
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : 'Unable to update status');
        },
      },
    );
  };

  const handleGroupDuplicate = () => {
    if (!selectedRows.length) return;
    duplicateCustomers.mutate(selectedRows, {
      onSuccess: () => {
        successToast(`Duplicated ${selectedRows.length} customers`);
        setRowSelection({});
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : 'Unable to duplicate customers');
      },
    });
  };

  const handleGroupExport = () => {
    if (!selectedRows.length) return;
    const header = ['User ID', 'Name', 'Email', 'Country', 'Orders', 'Total Spent', 'Avg Spent', 'Status'];
    const lines = selectedRows.map((customer) =>
      [
        customer.user,
        customer.customerInfo.title,
        customer.customerInfo.label,
        customer.location.name,
        customer.created,
        customer.total,
        customer.price,
        customer.status.label,
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(','),
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'customers.csv';
    link.click();
    URL.revokeObjectURL(url);
    successToast(`Exported ${selectedRows.length} customers`);
  };

  const handleConfirmGroupDelete = () => {
    const ids = selectedRows.map((customer) => customer.id);
    if (!ids.length) return;
    deleteCustomers.mutate(ids, {
      onSuccess: () => {
        successToast(`Deleted ${ids.length} customers`);
        setRowSelection({});
        setIsGroupDeleteDialogOpen(false);
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : 'Unable to delete customers');
      },
    });
  };

  const ColumnInputFilter = <TData, TValue>({ column }: IColumnFilterProps<TData, TValue>) => {
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

  const columns = useMemo<ColumnDef<CustomerListRow>[]>(
    () => [
      {
        accessorKey: 'id',
        accessorFn: (row) => row.id,
        header: () => <DataGridTableRowSelectAll />,
        cell: ({ row }) => <DataGridTableRowSelect row={row} />,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        size: 45,
        maxSize: 45,
        minSize: 45,
        meta: { cellClassName: '' },
      },
      {
        id: 'user',
        accessorFn: (row) => row.user,
        header: ({ column }) => <DataGridColumnHeader title="User ID" column={column} />,
        cell: (info) => (
          <span
            className="text-sm text-primary font-medium cursor-pointer hover:text-primary/80 transition-colors"
            onClick={() => handleOpenCustomerDetails(info.row.original)}
          >
            {info.row.original.user}
          </span>
        ),
        enableSorting: true,
        size: 110,
        meta: { cellClassName: '' },
      },
      {
        id: 'customerInfo',
        accessorFn: (row) => row.customerInfo,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Customer"
            filter={<ColumnInputFilter column={column} />}
            column={column}
          />
        ),
        cell: (info) => {
          const customerInfo = info.row.original.customerInfo;
          return (
            <div className="flex items-center gap-2.5">
              <CustomerAvatar
                image={avatarSrc(customerInfo.image)}
                statusColor={customerInfo.statusColor as VariantProps<typeof AvatarStatus>['variant']}
                verified={customerInfo.verified}
              />
              <div className="flex flex-col gap-1 truncate">
                <span
                  className="text-sm font-medium text-foreground leading-3.5 cursor-pointer hover:text-primary transition-colors"
                  onClick={() => handleOpenCustomerDetails(info.row.original)}
                >
                  {customerInfo.title}
                </span>
                <span className="text-xs font-normal text-secondary-foreground">
                  {customerInfo.label}
                </span>
              </div>
            </div>
          );
        },
        enableSorting: true,
        size: 240,
        meta: { cellClassName: '' },
      },
      {
        id: 'location',
        accessorFn: (row) => row.location.name,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Country"
            filter={<ColumnInputFilter column={column} />}
            column={column}
          />
        ),
        cell: (info) => {
          const location = info.row.original.location;
          return (
            <div className="flex items-center gap-1.5">
              <img
                src={toAbsoluteUrl(`/media/flags/${location.flag}`)}
                className="h-4 rounded-full"
                alt={location.name}
              />
              <span className="text-sm leading-none text-foreground font-normal">
                {location.name}
              </span>
            </div>
          );
        },
        enableSorting: true,
        size: 130,
        meta: { cellClassName: '' },
      },
      {
        id: 'created',
        accessorFn: (row) => row.created,
        header: ({ column }) => <DataGridColumnHeader title="Orders" column={column} />,
        cell: (info) => info.row.original.created,
        enableSorting: true,
        size: 80,
        meta: { cellClassName: '' },
      },
      {
        id: 'total',
        accessorFn: (row) => row.total,
        header: ({ column }) => <DataGridColumnHeader title="Total Spent" column={column} />,
        cell: (info) => <div>{info.row.original.total}</div>,
        enableSorting: true,
        size: 110,
        meta: { cellClassName: '' },
      },
      {
        id: 'price',
        accessorFn: (row) => row.price,
        header: ({ column }) => <DataGridColumnHeader title="Avg. Spent" column={column} />,
        cell: (info) => <div>{info.row.original.price}</div>,
        enableSorting: true,
        size: 100,
        meta: { cellClassName: '' },
      },
      {
        id: 'status',
        accessorFn: (row) => row.status.label,
        header: ({ column }) => <DataGridColumnHeader title="Status" column={column} />,
        cell: (info) => {
          const status = info.row.original.status;
          return (
            <Badge variant={status.variant as BadgeProps['variant']} appearance="light">
              {status.label}
            </Badge>
          );
        },
        enableSorting: true,
        size: 90,
        meta: { cellClassName: '' },
      },
      {
        id: 'updated',
        accessorFn: (row) => row.updated,
        header: ({ column }) => <DataGridColumnHeader title="Last Order" column={column} />,
        cell: (info) => info.row.original.updated,
        enableSorting: true,
        size: 120,
        meta: { cellClassName: '' },
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              mode="icon"
              onClick={() => handleOpenCustomerDetails(row.original)}
              title="View customer"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              mode="icon"
              onClick={() => handleOpenCustomerForm('edit', row.original)}
              title="Edit customer"
            >
              <SquarePen className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              mode="icon"
              onClick={() => {
                setCustomerToDelete(row.original);
                setIsDeleteDialogOpen(true);
              }}
              title="Delete customer"
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        ),
        size: 120,
        meta: { cellClassName: '' },
      },
    ],
    [],
  );

  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    const query = searchQuery.toLowerCase();
    return data.filter(
      (item) =>
        item.user.toLowerCase().includes(query) ||
        item.customerInfo.title.toLowerCase().includes(query) ||
        item.customerInfo.label.toLowerCase().includes(query),
    );
  }, [data, searchQuery]);

  const selectedRowsCount = selectedRows.length;
  const totalRowsCount = filteredData.length;

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchQuery]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      pagination: {
        pageIndex: pagination.pageIndex,
        pageSize: 10,
      },
      sorting,
      rowSelection,
    },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleCustomerFormClose = (open: boolean) => {
    setIsCustomerFormOpen(open);
    if (!open) onSheetClose?.();
  };

  const handleCustomerDetailsClose = (open: boolean) => {
    setIsCustomerSheetOpen(open);
    if (!open) onSheetClose?.();
  };

  const handleEditFromDetails = () => {
    setIsCustomerSheetOpen(false);
    setCustomerFormMode('edit');
    setIsCustomerFormOpen(true);
  };

  return (
    <div>
      {isError && (
        <p className="text-sm text-destructive mb-3">Unable to load customers. Check your connection and try again.</p>
      )}
      {isLoading && <p className="text-sm text-muted-foreground mb-3">Loading customers...</p>}
      {!isLoading && !isError && data.length === 0 && (
        <p className="text-sm text-muted-foreground mb-3">No customers yet. Create your first customer to get started.</p>
      )}
      <Card>
        <CardHeader className="py-3 flex-nowrap">
          <div className="flex items-center justify-between w-full">
            <h3 className="text-base font-semibold text-foreground leading-0">Customers</h3>
            <CardToolbar className="flex items-center gap-2">
              <div className="w-full max-w-[200px]">
                <InputWrapper>
                  <Search />
                  <Input
                    placeholder="Search customers"
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
                    onClick={() => {
                      setInputValue('');
                      setSearchQuery('');
                      inputRef.current?.focus();
                    }}
                    variant="dim"
                    className="-me-4"
                    disabled={inputValue === ''}
                  >
                    {inputValue !== '' && <X size={16} />}
                  </Button>
                </InputWrapper>
              </div>
            </CardToolbar>
          </div>
        </CardHeader>
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
          <CardTable>
            <ScrollArea>
              <DataGridTable />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardTable>
          <CardFooter>
            <DataGridPagination />
          </CardFooter>
        </DataGrid>
      </Card>

      {selectedRowsCount > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300">
          <div className="dark bg-zinc-950 text-white rounded-xl px-2 py-1 shadow-lg border">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium ps-3 pe-1">
                {selectedRowsCount} of {totalRowsCount} selected
              </span>
              <Separator className="h-10" orientation="vertical" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="dark">
                    <Link className="h-4 w-4 mr-2" />
                    Change status
                    <ChevronUp className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="dark">
                  {['Active', 'Inactive', 'Pending', 'Banned'].map((status) => (
                    <DropdownMenuItem key={status} onClick={() => handleGroupStatusChange(status)}>
                      {status}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Separator className="h-8 bg-zinc-700" orientation="vertical" />
              <Button variant="ghost" size="sm" onClick={handleGroupDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
              <Separator className="h-8 bg-zinc-700" orientation="vertical" />
              <Button variant="ghost" size="sm" onClick={handleGroupExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Separator className="h-8 bg-zinc-700" orientation="vertical" />
              <Button variant="ghost" size="sm" onClick={() => setIsGroupDeleteDialogOpen(true)}>
                <Trash className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      <CustomerDetailsSheet
        open={isCustomerSheetOpen}
        onOpenChange={handleCustomerDetailsClose}
        onEditClick={handleEditFromDetails}
        customer={selectedCustomer}
      />
      <CustomerFormSheet
        mode={customerFormMode}
        open={isCustomerFormOpen}
        onOpenChange={handleCustomerFormClose}
        customer={selectedCustomer}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{customerToDelete?.customerInfo.title}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCustomerToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmDelete}>
              Delete Customer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isGroupDeleteDialogOpen} onOpenChange={setIsGroupDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Customers</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedRowsCount} customers</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmGroupDelete}>
              Delete {selectedRowsCount} Customers
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  Column,
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  RowSelectionState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { Info, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { toAbsoluteUrl } from '@/lib/helpers';
import { formatMoney } from '@/store-inventory/lib/format';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Badge, BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardFooter,
  CardHeader,
  CardTable,
  CardTitle,
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
import { Input, InputWrapper } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface IColumnFilterProps<TData, TValue> {
  column: Column<TData, TValue>;
}

interface IData {
  id: string; // Use string for ID
  date: string;
  customer: string;
  orderId: string;
  paymentMethod: string;
  country: ICountry;
  label: string;
  variant: string;
  amount: string;
}

interface ICountry {
  name: string;
  flag: string;
}

const data: IData[] = [
  {
    id: '1',
    orderId: '#583920-XT',
    date: '18 Aug, 2025',
    customer: 'Mia Martinez',
    amount: formatMoney(83),
    paymentMethod: 'Visa',
    country: {
      name: 'Estonia',
      flag: 'estonia.svg',
    },
    label: 'Delivered',
    variant: 'success',
  },
  {
    id: '2',
    orderId: '#104761-BQ',
    date: '20 Jan, 2025',
    customer: 'Alice Morgan',
    amount: formatMoney(99),
    paymentMethod: 'Mastercard',
    country: {
      name: 'India',
      flag: 'india.svg',
    },
    label: 'Pending',
    variant: 'warning',
  },
  {
    id: '3',
    orderId: '#847305-ZR',
    date: '19 Feb, 2025',
    customer: 'Noah Garcia',
    amount: formatMoney(120),
    paymentMethod: 'iDeal',
    country: {
      name: 'Malaysia',
      flag: 'malaysia.svg',
    },
    label: 'Delivered',
    variant: 'success',
  },
  {
    id: '4',
    orderId: '#229176-LK',
    date: '16 Mar, 2025',
    customer: 'Liam Brown',
    amount: formatMoney(72),
    paymentMethod: 'Paypal',
    country: {
      name: 'Ukraine',
      flag: 'ukraine.svg',
    },
    label: 'Cancelled',
    variant: 'destructive',
  },
  {
    id: '5',
    orderId: '#671452-VN',
    date: '29 Mar, 2025',
    customer: 'Emma Chen',
    amount: formatMoney(169),
    paymentMethod: 'Mastercard',
    country: {
      name: 'Canada',
      flag: 'canada.svg',
    },
    label: 'Delivered',
    variant: 'success',
  },
  {
    id: '6',
    orderId: '#398274-JY',
    date: '9 Aug, 2025',
    customer: 'Olivia Davis',
    amount: formatMoney(110),
    paymentMethod: 'iDeal',
    country: {
      name: 'Malaysia',
      flag: 'malaysia.svg',
    },
    label: 'Delivered',
    variant: 'success',
  },
  {
    id: '7',
    orderId: '#750163-DP',
    date: '22 Jul, 2025',
    customer: 'Lucas Anderson',
    amount: formatMoney(49),
    paymentMethod: 'Mastercard',
    country: {
      name: 'Malaysia',
      flag: 'malaysia.svg',
    },
    label: 'Pending',
    variant: 'warning',
  },
  {
    id: '8',
    orderId: '#912048-MF',
    date: '28 Apr, 2025',
    customer: 'Sophia Patel',
    amount: formatMoney(230),
    paymentMethod: 'Visa',
    country: {
      name: 'Ukraine',
      flag: 'ukraine.svg',
    },
    label: 'Delivered',
    variant: 'success',
  },
  {
    id: '9',
    orderId: '#336791-TA',
    date: '10 Jan, 2025',
    customer: 'Ethan Wilson',
    amount: formatMoney(140),
    paymentMethod: 'Visa',
    country: {
      name: 'Canada',
      flag: 'canada.svg',
    },
    label: 'Cancelled',
    variant: 'destructive',
  },
  {
    id: '10',
    orderId: '#508234-WS',
    date: '22 Jul, 2025',
    customer: 'James Liu',
    amount: formatMoney(84),
    paymentMethod: 'iDeal',
    country: {
      name: 'India',
      flag: 'india.svg',
    },
    label: 'Delivered',
    variant: 'success',
  },
  {
    id: '11',
    orderId: '#792547-KP',
    date: '5 Sep, 2025',
    customer: 'Isabella Rodriguez',
    amount: formatMoney(195),
    paymentMethod: 'Visa',
    country: {
      name: 'Estonia',
      flag: 'estonia.svg',
    },
    label: 'Delivered',
    variant: 'success',
  },
  {
    id: '12',
    orderId: '#641829-MN',
    date: '12 Oct, 2025',
    customer: 'Alexander Johnson',
    amount: formatMoney(67.5),
    paymentMethod: 'Paypal',
    country: {
      name: 'Canada',
      flag: 'canada.svg',
    },
    label: 'Pending',
    variant: 'warning',
  },
  {
    id: '13',
    orderId: '#358147-QR',
    date: '28 Nov, 2025',
    customer: 'Charlotte Lee',
    amount: formatMoney(156.75),
    paymentMethod: 'Mastercard',
    country: {
      name: 'Ukraine',
      flag: 'ukraine.svg',
    },
    label: 'Cancelled',
    variant: 'destructive',
  },
  {
    id: '14',
    orderId: '#496823-ST',
    date: '3 Dec, 2025',
    customer: 'Benjamin White',
    amount: formatMoney(89.25),
    paymentMethod: 'iDeal',
    country: {
      name: 'Malaysia',
      flag: 'malaysia.svg',
    },
    label: 'Delivered',
    variant: 'success',
  },
  {
    id: '15',
    orderId: '#715390-UV',
    date: '15 Dec, 2025',
    customer: 'Amelia Harris',
    amount: formatMoney(203),
    paymentMethod: 'Visa',
    country: {
      name: 'India',
      flag: 'india.svg',
    },
    label: 'Delivered',
    variant: 'success',
  },
  {
    id: '16',
    orderId: '#824657-WX',
    date: '2 Jan, 2026',
    customer: 'Harper Clark',
    amount: formatMoney(45.8),
    paymentMethod: 'Mastercard',
    country: {
      name: 'Estonia',
      flag: 'estonia.svg',
    },
    label: 'Pending',
    variant: 'warning',
  },
  {
    id: '17',
    orderId: '#937164-YZ',
    date: '18 Jan, 2026',
    customer: 'Evelyn Lewis',
    amount: formatMoney(178.9),
    paymentMethod: 'Paypal',
    country: {
      name: 'Canada',
      flag: 'canada.svg',
    },
    label: 'Delivered',
    variant: 'success',
  },
  {
    id: '18',
    orderId: '#048572-AB',
    date: '25 Jan, 2026',
    customer: 'Sebastian Walker',
    amount: formatMoney(92.4),
    paymentMethod: 'iDeal',
    country: {
      name: 'Ukraine',
      flag: 'ukraine.svg',
    },
    label: 'Cancelled',
    variant: 'destructive',
  },
  {
    id: '19',
    orderId: '#159683-CD',
    date: '8 Feb, 2026',
    customer: 'Abigail Hall',
    amount: formatMoney(134.6),
    paymentMethod: 'Visa',
    country: {
      name: 'Malaysia',
      flag: 'malaysia.svg',
    },
    label: 'Delivered',
    variant: 'success',
  },
  {
    id: '20',
    orderId: '#260794-EF',
    date: '14 Feb, 2026',
    customer: 'Henry Allen',
    amount: formatMoney(76.3),
    paymentMethod: 'Mastercard',
    country: {
      name: 'India',
      flag: 'india.svg',
    },
    label: 'Pending',
    variant: 'warning',
  },
  {
    id: '21',
    orderId: '#371805-GH',
    date: '22 Feb, 2026',
    customer: 'Ella Young',
    amount: formatMoney(211.5),
    paymentMethod: 'Paypal',
    country: {
      name: 'Estonia',
      flag: 'estonia.svg',
    },
    label: 'Delivered',
    variant: 'success',
  },
  {
    id: '22',
    orderId: '#482916-IJ',
    date: '5 Mar, 2026',
    customer: 'Owen Hernandez',
    amount: formatMoney(58.7),
    paymentMethod: 'iDeal',
    country: {
      name: 'Canada',
      flag: 'canada.svg',
    },
    label: 'Cancelled',
    variant: 'destructive',
  },
  {
    id: '23',
    orderId: '#593027-KL',
    date: '12 Mar, 2026',
    customer: 'Scarlett King',
    amount: formatMoney(147.25),
    paymentMethod: 'Visa',
    country: {
      name: 'Ukraine',
      flag: 'ukraine.svg',
    },
    label: 'Delivered',
    variant: 'success',
  },
  {
    id: '24',
    orderId: '#604138-MN',
    date: '20 Mar, 2026',
    customer: 'Jack Wright',
    amount: formatMoney(103.8),
    paymentMethod: 'Mastercard',
    country: {
      name: 'Malaysia',
      flag: 'malaysia.svg',
    },
    label: 'Pending',
    variant: 'warning',
  },
  {
    id: '25',
    orderId: '#715249-OP',
    date: '28 Mar, 2026',
    customer: 'Grace Lopez',
    amount: formatMoney(189.95),
    paymentMethod: 'Paypal',
    country: {
      name: 'India',
      flag: 'india.svg',
    },
    label: 'Delivered',
    variant: 'success',
  },
];

function RecentOrdersToolbar({
  searchQuery,
  onSearchChange,
  inputRef,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const [inputValue, setInputValue] = useState(searchQuery);

  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue !== searchQuery) {
        onSearchChange(inputValue);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, onSearchChange, searchQuery]);

  return (
    <CardToolbar>
      <div className="w-full max-w-[200px]">
        <InputWrapper>
          <Search />
          <Input
            placeholder="Search by ID"
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              onSearchChange(e.target.value);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          />
          <Button
            onClick={() => {
              setInputValue('');
              onSearchChange('');
            }}
            variant="dim"
            className="-me-4"
            disabled={inputValue === ''}
          >
            {inputValue !== '' && <X size={16} />}
          </Button>
        </InputWrapper>
      </div>
      <Button variant="outline">Export CSV</Button>
    </CardToolbar>
  );
}

const DashboardTable = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [rowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'date', desc: true },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);

  const ColumnInputFilter = <TData, TValue>({
    column,
  }: IColumnFilterProps<TData, TValue>) => {
    return (
      <Input
        placeholder="Filter..."
        value={(column.getFilterValue() as string) ?? ''}
        onChange={(event) => column.setFilterValue(event.target.value)}
        variant="sm"
        className="max-w-40"
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
        size: 48,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'orderId',
        accessorFn: (row) => row.orderId,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Order ID"
            filter={<ColumnInputFilter column={column} />}
            column={column}
          />
        ),
        cell: (info) => {
          return info.row.original.orderId;
        },
        enableSorting: true,
        size: 210,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'date',
        accessorFn: (row) => row.date,
        header: ({ column }) => (
          <DataGridColumnHeader title="Date" column={column} />
        ),
        cell: (info) => {
          return info.row.original.date;
        },
        enableSorting: true,
        size: 170,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'customer',
        accessorFn: (row) => row.customer,
        header: ({ column }) => (
          <DataGridColumnHeader title="Customer" column={column} />
        ),
        cell: (info) => {
          return info.row.original.customer;
        },
        enableSorting: true,
        size: 160,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'amount',
        accessorFn: (row) => row.amount,
        header: ({ column }) => (
          <DataGridColumnHeader title="Amount" column={column} />
        ),
        cell: (info) => {
          return info.row.original.amount;
        },
        enableSorting: true,
        size: 160,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'paymentMethod',
        accessorFn: (row) => row.paymentMethod,
        header: ({ column }) => (
          <DataGridColumnHeader title="Payment Method" column={column} />
        ),
        cell: (info) => {
          return info.row.original.paymentMethod;
        },
        enableSorting: true,
        size: 160,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'country',
        accessorFn: (row) => row.country,
        header: ({ column }) => (
          <DataGridColumnHeader title="Country" column={column} />
        ),
        cell: (info) => {
          return (
            <div className="flex items-center gap-1.5">
              <img
                src={toAbsoluteUrl(
                  `/media/flags/${info.row.original.country.flag}`,
                )}
                className="h-4 rounded-full"
                alt="image"
              />
              <span className="leading-none text-secondary-foreground">
                {info.row.original.country.name}
              </span>
            </div>
          );
        },
        enableSorting: true,
        size: 160,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'label',
        accessorFn: (row) => row.label,
        header: ({ column }) => (
          <DataGridColumnHeader title="Order Status" column={column} />
        ),
        cell: (info) => {
          const variant = info.row.original
            .variant as keyof BadgeProps['variant'];

          return (
            <Badge variant={variant} appearance="light">
              {info.row.original.label}
            </Badge>
          );
        },
        enableSorting: true,
        size: 150,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'actions',
        header: () => '',
        enableSorting: false,
        cell: () => {
          return (
            <Button mode="link" underlined="dashed">
              Details
            </Button>
          );
        },
        size: 90,
      },
    ],
    [],
  );

  const filteredData: IData[] = useMemo(() => {
    if (!searchQuery) return data;

    const query = searchQuery.toLowerCase();
    return data.filter((item) => {
      return item.id.toLowerCase().includes(query);
    });
  }, [searchQuery]);

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
    columns,
    data: filteredData,
    pageCount: Math.ceil((filteredData?.length || 0) / pagination.pageSize),
    getRowId: (row: IData) => row.id,
    state: {
      pagination,
      sorting,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
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
          <CardTitle>Recent Orders</CardTitle>
          <RecentOrdersToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            inputRef={inputRef}
          />
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
};

export { DashboardTable };

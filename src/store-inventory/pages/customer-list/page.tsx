'use client';

import { useMemo, useState } from 'react';
import { Plus, Upload, ChevronDown, BarChart3, User, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/i18n/use-t';
import { Button } from '@/components/ui/button';
import { CustomerListDisplaySheet, CustomerListTable } from '../tables/customer-list';
import { useCustomers, useDeleteCustomers } from '@/store-inventory/hooks/use-inventory';
import { isSupabaseConfigured } from '@/lib/supabase';
import { customerListMockData } from '@/store-inventory/data/customers';
import { mapCustomerError } from '@/store-inventory/lib/customer-errors';
import type { CustomerListRow } from '@/store-inventory/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const EMPTY_CUSTOMERS: CustomerListRow[] = [];

export function CustomerList() {
  const t = useT();
  const [displaySheet, setDisplaySheet] = useState<CustomerListDisplaySheet | undefined>(undefined);
  const [shouldOpenSheet, setShouldOpenSheet] = useState(false);
  const [selectedRows, setSelectedRows] = useState<CustomerListRow[]>([]);
  const [profileId, setProfileId] = useState<string | undefined>();
  const { data, isLoading, isError } = useCustomers();
  const deleteCustomers = useDeleteCustomers();
  const customers = isSupabaseConfigured ? (data ?? EMPTY_CUSTOMERS) : (data ?? customerListMockData);

  const summary = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((customer) => customer.status.label.toLowerCase() === 'active').length;
    const activePct = total ? Math.round((active / total) * 100) : 0;
    return { total, activePct };
  }, [customers]);

  const openSheet = (sheet: CustomerListDisplaySheet) => {
    setDisplaySheet(sheet);
    setShouldOpenSheet(true);
  };

  const handleViewProfile = () => {
    if (!selectedRows[0]) {
      toast.error(t('Select a customer to view their profile'));
      return;
    }
    setProfileId(selectedRows[0].id);
    openSheet('customerDetails');
  };

  const handleExport = () => {
    const rows = selectedRows.length ? selectedRows : customers;
    if (!rows.length) {
      toast.error(t('No customers to export'));
      return;
    }
    const header = [
      t('User ID'),
      t('Name'),
      t('Email'),
      t('Country'),
      t('Orders'),
      t('Total Spent'),
      t('Avg Spent'),
      t('Status'),
    ];
    const lines = rows.map((customer) =>
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
    toast.success(t('Exported {count} customers', { count: rows.length }));
  };

  const handleDeleteSelected = () => {
    if (!selectedRows.length) {
      toast.error(t('Select customers to archive'));
      return;
    }
    deleteCustomers.mutate(
      selectedRows.map((customer) => customer.id),
      {
        onSuccess: () => toast.success(t('Archived {count} customers', { count: selectedRows.length })),
        onError: (error) => toast.error(t(mapCustomerError(error).message)),
      },
    );
  };

  return (
    <div className="container-fluid space-y-5 lg:space-y-9">
      <div className="flex items-center flex-wrap gap-2 justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground">{t('Customer List')}</h1>
          <span className="text-sm text-muted-foreground">
            {summary.total === 1
              ? t('{count} customer found. {pct}% are active', { count: summary.total, pct: summary.activePct })
              : t('{count} customers found. {pct}% are active', { count: summary.total, pct: summary.activePct })}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 shrink-0" onClick={handleExport}>
            <Upload className="h-4 w-4" />
            {t('Export')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-[130px] justify-between">
                {t('More Actions')}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleViewProfile}>
                <BarChart3 />
                {t('Customer Tracking')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleViewProfile}>
                <User />
                {t('View Customer Profile')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={handleDeleteSelected}>
                <Trash2 />
                {t('Archive Selected')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="mono" onClick={() => openSheet('createCustomer')}>
            <Plus /> {t('New')}
          </Button>
        </div>
      </div>

      <CustomerListTable
        mockData={customers}
        isLoading={isLoading}
        isError={isError}
        displaySheet={displaySheet}
        shouldOpenSheet={shouldOpenSheet}
        selectedCustomerId={displaySheet === 'customerDetails' ? profileId : undefined}
        onSheetClose={() => setShouldOpenSheet(false)}
        onSelectedRowsChange={setSelectedRows}
      />
    </div>
  );
}

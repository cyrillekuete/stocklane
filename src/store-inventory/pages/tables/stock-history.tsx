import { useEffect, useMemo, useRef, useState } from 'react';
import { endOfDay, format, startOfDay } from 'date-fns';
import {
  Calendar as CalendarIcon,
  FileSpreadsheet,
  FileText,
  Search,
  Settings2,
  X,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { useT } from '@/i18n/use-t';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardTable } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input, InputWrapper } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useStockHistory } from '@/store-inventory/hooks/use-inventory';
import { useStoreSettings } from '@/store-inventory/hooks/use-settings';
import { useWarehouseFilter } from '@/store-inventory/lib/warehouse-filter';
import {
  downloadStockHistoryCsv,
  formatStockHistoryDateCell,
  generateStockHistoryPdf,
  type StockHistoryPdfLabels,
  type StockHistoryVisibleColumns,
} from '@/store-inventory/lib/stock-history-pdf';
import { formatHistoryNumber, formatSignedQty } from '@/store-inventory/lib/stock-history';
import { WarehouseSelect } from '../components/warehouse-select';
import type { BadgeProps } from '@/components/ui/badge';
import type { StockHistoryRow } from '@/store-inventory/types';

function todayRange(): DateRange {
  const today = new Date();
  return { from: today, to: today };
}

function QtyBadge({
  qty,
  style,
  variant,
}: {
  qty: number;
  style: 'unsigned' | 'plus' | 'signed';
  variant: NonNullable<BadgeProps['variant']>;
}) {
  return (
    <Badge variant={variant} appearance="light" size="md" className="min-w-10 font-medium tabular-nums">
      {formatSignedQty(qty, style)}
    </Badge>
  );
}

export function StockHistoryTable() {
  const t = useT();
  const { warehouseId } = useWarehouseFilter();
  const { data: settings } = useStoreSettings();
  const defaultRange = useMemo(() => todayRange(), []);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultRange);
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(defaultRange);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const isApplyingRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [showUnitPrice, setShowUnitPrice] = useState(false);
  const [showAmt, setShowAmt] = useState(false);

  const rangeStart = useMemo(
    () => startOfDay(dateRange?.from ?? dateRange?.to ?? new Date()),
    [dateRange?.from, dateRange?.to],
  );
  const rangeEnd = useMemo(
    () => endOfDay(dateRange?.to ?? dateRange?.from ?? new Date()),
    [dateRange?.from, dateRange?.to],
  );

  const { data, isLoading, isError } = useStockHistory(warehouseId, rangeStart, rangeEnd);

  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  const filteredRows = useMemo(() => {
    const rows = data ?? [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(
      (row) =>
        row.item.toLowerCase().includes(query) || row.sku.toLowerCase().includes(query),
    );
  }, [data, searchQuery]);

  const groupSpan = 1 + (showUnitPrice ? 1 : 0) + (showAmt ? 1 : 0);
  const dateLabel = formatStockHistoryDateCell(rangeStart, rangeEnd);
  const flags: StockHistoryVisibleColumns = { unitPrice: showUnitPrice, amt: showAmt };

  const exportLabels = (): StockHistoryPdfLabels => ({
    title: t('Stock history'),
    printed: t('Printed'),
    dateRange: t('Date range'),
    allTime: t('All time'),
    date: t('Date'),
    item: t('Item'),
    qty: t('Qty'),
    unitPrice: t('Unit price'),
    amt: t('Amt'),
    initialStock: t('Initial stock'),
    purchasedStock: t('Purchased stock'),
    qtySold: t('Qty sold'),
    adjustment: t('Adjustment'),
    finalStock: t('Final stock'),
  });

  const handleDateRangeApply = () => {
    isApplyingRef.current = true;
    const next = tempDateRange?.from
      ? { from: tempDateRange.from, to: tempDateRange.to ?? tempDateRange.from }
      : todayRange();
    setDateRange(next);
    setTempDateRange(next);
    setIsDatePickerOpen(false);
    setTimeout(() => {
      isApplyingRef.current = false;
    }, 100);
  };

  const handleDateRangeReset = () => {
    isApplyingRef.current = true;
    const next = todayRange();
    setTempDateRange(next);
    setDateRange(next);
    setIsDatePickerOpen(false);
    setTimeout(() => {
      isApplyingRef.current = false;
    }, 100);
  };

  const handleDateRangeCancel = () => {
    isApplyingRef.current = true;
    setTempDateRange(dateRange);
    setIsDatePickerOpen(false);
    setTimeout(() => {
      isApplyingRef.current = false;
    }, 100);
  };

  const handleClearInput = () => {
    setSearchQuery('');
    inputRef.current?.focus();
  };

  const handleDownloadPdf = () => {
    generateStockHistoryPdf(filteredRows, {
      storeName: settings?.storeName ?? t('Store'),
      labels: exportLabels(),
      flags,
      dateFrom: rangeStart,
      dateTo: rangeEnd,
    });
  };

  const handleDownloadCsv = () => {
    downloadStockHistoryCsv(filteredRows, {
      labels: exportLabels(),
      flags,
      dateFrom: rangeStart,
      dateTo: rangeEnd,
    });
  };

  const moneyCell = (value: number) => (
    <span className="tabular-nums text-muted-foreground">{formatHistoryNumber(value)}</span>
  );

  const groupCells = (row: StockHistoryRow, qty: number, amt: number, badge: {
    style: 'unsigned' | 'plus' | 'signed';
    variant: NonNullable<BadgeProps['variant']>;
  }) => (
    <>
      <TableCell className="border-e text-center">
        <QtyBadge qty={qty} style={badge.style} variant={badge.variant} />
      </TableCell>
      {showUnitPrice && (
        <TableCell className="border-e text-center">{moneyCell(row.unitPrice)}</TableCell>
      )}
      {showAmt && <TableCell className="border-e text-center">{moneyCell(amt)}</TableCell>}
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label>{t('Date range')}</Label>
          <Popover
            open={isDatePickerOpen}
            onOpenChange={(open) => {
              if (open) {
                setTempDateRange(dateRange);
                setIsDatePickerOpen(open);
              } else if (!isApplyingRef.current) {
                setTempDateRange(dateRange);
                setIsDatePickerOpen(open);
              }
            }}
          >
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" className="min-w-[240px] justify-start">
                <CalendarIcon />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'MMM dd, yyyy')} - {format(dateRange.to, 'MMM dd, yyyy')}
                    </>
                  ) : (
                    format(dateRange.from, 'MMM dd, yyyy')
                  )
                ) : (
                  <span>{t('Pick date range')}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                autoFocus
                mode="range"
                defaultMonth={tempDateRange?.from || dateRange?.from}
                showOutsideDays={false}
                selected={tempDateRange}
                onSelect={(selected) =>
                  setTempDateRange({
                    from: selected?.from || undefined,
                    to: selected?.to || undefined,
                  })
                }
                numberOfMonths={2}
              />
              <div className="flex items-center justify-between border-t border-border p-3">
                <Button variant="outline" onClick={handleDateRangeReset}>
                  {t('Reset')}
                </Button>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" onClick={handleDateRangeCancel}>
                    {t('Cancel')}
                  </Button>
                  <Button onClick={handleDateRangeApply}>{t('Apply')}</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label>{t('Warehouse')}</Label>
          <WarehouseSelect />
        </div>

        <div className="space-y-1.5">
          <Label>{t('Search')}</Label>
          <div className="w-full min-w-[220px] max-w-[280px]">
            <InputWrapper>
              <Search />
              <Input
                placeholder={t('Search items...')}
                ref={inputRef}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setSearchQuery(e.target.value);
                }}
              />
              <Button
                onClick={handleClearInput}
                variant="dim"
                className="-me-4"
                disabled={inputValue === ''}
              >
                {inputValue !== '' && <X size={16} />}
              </Button>
            </InputWrapper>
          </div>
        </div>

        <div className="ms-auto flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline">
                <Settings2 />
                {t('Columns')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px]">
              <DropdownMenuLabel className="font-medium">{t('Toggle Columns')}</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={showUnitPrice}
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={(value) => setShowUnitPrice(!!value)}
              >
                {t('Unit price')}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={showAmt}
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={(value) => setShowAmt(!!value)}
              >
                {t('Amt')}
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button type="button" variant="outline" onClick={handleDownloadPdf} disabled={isLoading}>
            <FileText />
            {t('Download PDF')}
          </Button>
          <Button type="button" variant="outline" onClick={handleDownloadCsv} disabled={isLoading}>
            <FileSpreadsheet />
            {t('Download CSV')}
          </Button>
        </div>
      </div>

      {isError && (
        <p className="text-sm text-destructive">{t('Unable to load stock history')}</p>
      )}

      <Card>
        <CardTable>
          <Table className="min-w-max">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead rowSpan={2} className="border-e align-middle">
                  {t('Date')}
                </TableHead>
                <TableHead rowSpan={2} className="border-e align-middle">
                  {t('Item')}
                </TableHead>
                <TableHead colSpan={groupSpan} className="border-e text-center">
                  {t('Initial stock')}
                </TableHead>
                <TableHead colSpan={groupSpan} className="border-e text-center">
                  {t('Purchased stock')}
                </TableHead>
                <TableHead colSpan={groupSpan} className="border-e text-center">
                  {t('Qty sold')}
                </TableHead>
                <TableHead rowSpan={2} className="border-e text-center align-middle">
                  {t('Adjustment')}
                </TableHead>
                <TableHead colSpan={groupSpan} className="text-center">
                  {t('Final stock')}
                </TableHead>
              </TableRow>
              <TableRow className="hover:bg-transparent">
                <TableHead className="border-e text-center">{t('Qty')}</TableHead>
                {showUnitPrice && (
                  <TableHead className="border-e text-center">{t('Unit price')}</TableHead>
                )}
                {showAmt && <TableHead className="border-e text-center">{t('Amt')}</TableHead>}
                <TableHead className="border-e text-center">{t('Qty')}</TableHead>
                {showUnitPrice && (
                  <TableHead className="border-e text-center">{t('Unit price')}</TableHead>
                )}
                {showAmt && <TableHead className="border-e text-center">{t('Amt')}</TableHead>}
                <TableHead className="border-e text-center">{t('Qty')}</TableHead>
                {showUnitPrice && (
                  <TableHead className="border-e text-center">{t('Unit price')}</TableHead>
                )}
                {showAmt && <TableHead className="border-e text-center">{t('Amt')}</TableHead>}
                <TableHead className="text-center">{t('Qty')}</TableHead>
                {showUnitPrice && (
                  <TableHead className="border-s text-center">{t('Unit price')}</TableHead>
                )}
                {showAmt && <TableHead className="text-center">{t('Amt')}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3 + groupSpan * 4} className="h-24 text-center text-muted-foreground">
                    {t('Loading...')}
                  </TableCell>
                </TableRow>
              ) : filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3 + groupSpan * 4} className="h-24 text-center text-muted-foreground">
                    {t('No stock history for this period')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="border-e whitespace-nowrap text-muted-foreground">
                      {dateLabel}
                    </TableCell>
                    <TableCell className="border-e font-semibold">{row.item}</TableCell>
                    {groupCells(row, row.initialQty, row.initialAmt, {
                      style: 'unsigned',
                      variant: 'primary',
                    })}
                    {groupCells(row, row.purchasedQty, row.purchasedAmt, {
                      style: 'plus',
                      variant: 'success',
                    })}
                    {groupCells(row, row.soldQty, row.soldAmt, {
                      style: 'signed',
                      variant: 'destructive',
                    })}
                    <TableCell className="border-e text-center">
                      <QtyBadge qty={row.adjustmentQty} style="signed" variant="warning" />
                    </TableCell>
                    {groupCells(row, row.finalQty, row.finalAmt, {
                      style: 'unsigned',
                      variant: 'info',
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardTable>
      </Card>
    </div>
  );
}

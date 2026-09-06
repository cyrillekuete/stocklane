import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatMoney } from './format';
import { formatSignedQty } from './stock-history';
import type { StockHistoryRow } from '../types';

export type StockHistoryVisibleColumns = {
  unitPrice: boolean;
  amt: boolean;
};

export type StockHistoryPdfLabels = {
  title: string;
  printed: string;
  dateRange: string;
  allTime: string;
  date: string;
  item: string;
  qty: string;
  unitPrice: string;
  amt: string;
  initialStock: string;
  purchasedStock: string;
  qtySold: string;
  adjustment: string;
  finalStock: string;
};

type ExportColumn = {
  header: string;
  pdfValue: (row: StockHistoryRow) => string;
  csvValue: (row: StockHistoryRow) => string;
  align?: 'left' | 'right' | 'center';
};

function formatDateRangeLabel(from?: Date, to?: Date, allTime = 'All time') {
  if (!from && !to) return allTime;
  if (from && to) return `${format(from, 'd MMM yyyy')} – ${format(to, 'd MMM yyyy')}`;
  if (from) return `${format(from, 'd MMM yyyy')} –`;
  return `– ${format(to as Date, 'd MMM yyyy')}`;
}

export function formatStockHistoryDateCell(from?: Date, to?: Date) {
  const start = from ?? to;
  const end = to ?? from;
  if (!start || !end) return '—';
  return `${format(start, 'dd/MM/yyyy')} - ${format(end, 'dd/MM/yyyy')}`;
}

function addGroupColumns(
  columns: ExportColumn[],
  prefix: string,
  qty: (row: StockHistoryRow) => number,
  qtyStyle: 'unsigned' | 'plus' | 'signed',
  amt: (row: StockHistoryRow) => number,
  flags: StockHistoryVisibleColumns,
  labels: Pick<StockHistoryPdfLabels, 'qty' | 'unitPrice' | 'amt'>,
) {
  columns.push({
    header: `${prefix} ${labels.qty}`,
    pdfValue: (row) => formatSignedQty(qty(row), qtyStyle),
    csvValue: (row) => formatSignedQty(qty(row), qtyStyle),
    align: 'right',
  });
  if (flags.unitPrice) {
    columns.push({
      header: `${prefix} ${labels.unitPrice}`,
      pdfValue: (row) => formatMoney(row.unitPrice),
      csvValue: (row) => String(Math.round(row.unitPrice)),
      align: 'right',
    });
  }
  if (flags.amt) {
    columns.push({
      header: `${prefix} ${labels.amt}`,
      pdfValue: (row) => formatMoney(amt(row)),
      csvValue: (row) => String(Math.round(amt(row))),
      align: 'right',
    });
  }
}

export function buildStockHistoryExportColumns(options: {
  dateLabel: string;
  flags: StockHistoryVisibleColumns;
  labels: StockHistoryPdfLabels;
}): ExportColumn[] {
  const { dateLabel, flags, labels } = options;
  const columns: ExportColumn[] = [
    {
      header: labels.date,
      pdfValue: () => dateLabel,
      csvValue: () => dateLabel,
    },
    {
      header: labels.item,
      pdfValue: (row) => row.item,
      csvValue: (row) => row.item,
    },
  ];
  addGroupColumns(
    columns,
    labels.initialStock,
    (row) => row.initialQty,
    'unsigned',
    (row) => row.initialAmt,
    flags,
    labels,
  );
  addGroupColumns(
    columns,
    labels.purchasedStock,
    (row) => row.purchasedQty,
    'plus',
    (row) => row.purchasedAmt,
    flags,
    labels,
  );
  addGroupColumns(
    columns,
    labels.qtySold,
    (row) => row.soldQty,
    'signed',
    (row) => row.soldAmt,
    flags,
    labels,
  );
  columns.push({
    header: labels.adjustment,
    pdfValue: (row) => formatSignedQty(row.adjustmentQty, 'signed'),
    csvValue: (row) => formatSignedQty(row.adjustmentQty, 'signed'),
    align: 'right',
  });
  addGroupColumns(
    columns,
    labels.finalStock,
    (row) => row.finalQty,
    'unsigned',
    (row) => row.finalAmt,
    flags,
    labels,
  );
  return columns;
}

export function buildStockHistoryPdfFilename(when = new Date()) {
  return `stock-history-${format(when, 'yyyyMMdd-HHmm')}.pdf`;
}

export function buildStockHistoryCsvFilename(when = new Date()) {
  return `stock-history-${format(when, 'yyyyMMdd-HHmm')}.csv`;
}

export function generateStockHistoryPdf(
  rows: StockHistoryRow[],
  options: {
    storeName: string;
    labels: StockHistoryPdfLabels;
    flags: StockHistoryVisibleColumns;
    dateFrom?: Date;
    dateTo?: Date;
    filename?: string;
  },
) {
  const when = new Date();
  const dateLabel = formatStockHistoryDateCell(options.dateFrom, options.dateTo);
  const columns = buildStockHistoryExportColumns({
    dateLabel,
    flags: options.flags,
    labels: options.labels,
  });
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: columns.length > 10 ? 'a3' : 'a4',
  });
  const margin = 14;

  doc.setFontSize(16);
  doc.text(options.storeName || 'Store', margin, 16);
  doc.setFontSize(12);
  doc.text(options.labels.title, margin, 24);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`${options.labels.printed}: ${format(when, 'd MMM yyyy, HH:mm')}`, margin, 30);
  doc.text(
    `${options.labels.dateRange}: ${formatDateRangeLabel(options.dateFrom, options.dateTo, options.labels.allTime)}`,
    margin,
    36,
  );
  doc.setTextColor(0);

  const columnStyles: Record<number, { halign: 'left' | 'right' | 'center' }> = {};
  columns.forEach((column, index) => {
    if (column.align) columnStyles[index] = { halign: column.align };
  });

  autoTable(doc, {
    startY: 42,
    head: [columns.map((column) => column.header)],
    body: rows.map((row) => columns.map((column) => column.pdfValue(row))),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [30, 30, 30], textColor: 255 },
    columnStyles,
  });

  const filename = options.filename ?? buildStockHistoryPdfFilename(when);
  doc.save(filename);
  return filename;
}

export function downloadStockHistoryCsv(
  rows: StockHistoryRow[],
  options: {
    labels: StockHistoryPdfLabels;
    flags: StockHistoryVisibleColumns;
    dateFrom?: Date;
    dateTo?: Date;
    filename?: string;
  },
) {
  const dateLabel = formatStockHistoryDateCell(options.dateFrom, options.dateTo);
  const columns = buildStockHistoryExportColumns({
    dateLabel,
    flags: options.flags,
    labels: options.labels,
  });
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const header = columns.map((column) => escape(column.header)).join(',');
  const lines = rows.map((row) =>
    columns.map((column) => escape(column.csvValue(row))).join(','),
  );
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = options.filename ?? buildStockHistoryCsvFilename();
  link.click();
  URL.revokeObjectURL(url);
}

import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatMoney, parseMoney } from './format';
import type { InboundStockRow } from '../types';

export type StockEntryHistoryPdfLabels = {
  title: string;
  printed: string;
  dateRange: string;
  allTime: string;
  datetime: string;
  receivedBy: string;
  product: string;
  warehouse: string;
  qty: string;
  lineValue: string;
  totalQty: string;
  totalValue: string;
};

export function buildStockEntryHistoryPdfFilename(when = new Date()) {
  return `stock-entry-history-${format(when, 'yyyyMMdd-HHmm')}.pdf`;
}

function formatDateRangeLabel(
  from?: Date,
  to?: Date,
  allTime = 'All time',
) {
  if (!from && !to) return allTime;
  if (from && to) return `${format(from, 'd MMM yyyy')} – ${format(to, 'd MMM yyyy')}`;
  if (from) return `${format(from, 'd MMM yyyy')} –`;
  return `– ${format(to as Date, 'd MMM yyyy')}`;
}

export function generateStockEntryHistoryPdf(
  rows: InboundStockRow[],
  options: {
    storeName: string;
    labels: StockEntryHistoryPdfLabels;
    dateFrom?: Date;
    dateTo?: Date;
    filename?: string;
  },
) {
  const when = new Date();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const margin = 14;
  const totalQty = rows.reduce((sum, row) => sum + Number(row.qty ?? 0), 0);
  const totalValue = rows.reduce(
    (sum, row) => sum + (row.stockValue ?? parseMoney(row.stock)),
    0,
  );

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

  autoTable(doc, {
    startY: 42,
    head: [[
      options.labels.datetime,
      options.labels.receivedBy,
      options.labels.product,
      options.labels.warehouse,
      options.labels.qty,
      options.labels.lineValue,
    ]],
    body: rows.map((row) => [
      row.receivedAt || row.dateOrder,
      row.receivedBy || 'Unknown',
      row.productInfo.label
        ? `${row.productInfo.title} (${row.productInfo.label})`
        : row.productInfo.title,
      row.warehouseName || row.warehouse || '—',
      String(row.qty),
      formatMoney(row.stockValue ?? parseMoney(row.stock)),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 30, 30], textColor: 255 },
    columnStyles: {
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
  });

  const finalY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 42;
  doc.setFontSize(10);
  doc.text(`${options.labels.totalQty}: ${totalQty}`, margin, finalY + 10);
  doc.text(`${options.labels.totalValue}: ${formatMoney(totalValue)}`, margin, finalY + 16);

  const filename = options.filename ?? buildStockEntryHistoryPdfFilename(when);
  doc.save(filename);
  return filename;
}

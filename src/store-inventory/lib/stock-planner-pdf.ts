import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { StockPlannerRow } from '../types';

export type StockPlannerPdfLabels = {
  title: string;
  printed: string;
  product: string;
  sku: string;
  stock: string;
  reserved: string;
  targetLevel: string;
  delta: string;
  flow: string;
  reorderIn: string;
  reorder: string;
  leadTime: string;
  autoReorder: string;
  on: string;
  off: string;
  days: string;
  itemsPerDay: string;
};

export function buildStockPlannerPdfFilename(when = new Date()) {
  return `stock-planner-${format(when, 'yyyyMMdd-HHmm')}.pdf`;
}

function flowLabel(row: StockPlannerRow, itemsPerDay: string) {
  return `${row.flow} ${itemsPerDay}`;
}

function daysLabel(days: number, date: string, daysWord: string) {
  const primary = `${days} ${daysWord}`;
  return date ? `${primary} (${date})` : primary;
}

export function generateStockPlannerPdf(
  rows: StockPlannerRow[],
  options: {
    storeName: string;
    labels: StockPlannerPdfLabels;
    filename?: string;
  },
) {
  const when = new Date();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const margin = 14;

  doc.setFontSize(16);
  doc.text(options.storeName || 'Store', margin, 16);
  doc.setFontSize(12);
  doc.text(options.labels.title, margin, 24);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`${options.labels.printed}: ${format(when, 'd MMM yyyy, HH:mm')}`, margin, 30);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 36,
    head: [[
      options.labels.product,
      options.labels.sku,
      options.labels.stock,
      options.labels.reserved,
      options.labels.targetLevel,
      options.labels.delta,
      options.labels.flow,
      options.labels.reorderIn,
      options.labels.reorder,
      options.labels.leadTime,
      options.labels.autoReorder,
    ]],
    body: rows.map((row) => [
      row.productInfo.title,
      row.productInfo.label,
      String(row.stock),
      String(row.rsvd),
      String(row.tlvl),
      row.delta.label,
      flowLabel(row, options.labels.itemsPerDay),
      daysLabel(row.reorderIn.days, row.reorderIn.date, options.labels.days),
      String(row.reorder),
      daysLabel(row.leadTime.days, row.leadTime.date, options.labels.days),
      row.ar ? options.labels.on : options.labels.off,
    ]),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [30, 30, 30], textColor: 255 },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'center' },
      8: { halign: 'right' },
    },
  });

  const filename = options.filename ?? buildStockPlannerPdfFilename(when);
  doc.save(filename);
  return filename;
}

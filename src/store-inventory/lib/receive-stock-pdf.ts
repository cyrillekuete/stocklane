import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatMoney } from './format';
import type { InboundShipmentBatchResult } from '../services/inventory';

export type ReceiveStockPdfLabels = {
  title: string;
  product: string;
  warehouse: string;
  qty: string;
  unitValue: string;
  lineValue: string;
  totalQty: string;
  totalValue: string;
  date: string;
};

export function buildReceiveStockPdfFilename(when = new Date()) {
  return `stock-entry-${format(when, 'yyyyMMdd-HHmm')}.pdf`;
}

export function generateReceiveStockPdf(
  batch: InboundShipmentBatchResult,
  options: {
    storeName: string;
    labels: ReceiveStockPdfLabels;
    filename?: string;
  },
) {
  const when = new Date();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 14;

  doc.setFontSize(16);
  doc.text(options.storeName || 'Store', margin, 18);
  doc.setFontSize(12);
  doc.text(options.labels.title, margin, 26);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`${options.labels.date}: ${format(when, 'd MMM yyyy, HH:mm')}`, margin, 32);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 38,
    head: [[
      options.labels.product,
      options.labels.warehouse,
      options.labels.qty,
      options.labels.unitValue,
      options.labels.lineValue,
    ]],
    body: batch.lines.map((line) => [
      line.productSku ? `${line.productName} (${line.productSku})` : line.productName,
      line.warehouseName,
      String(line.qty),
      formatMoney(line.unitValue),
      formatMoney(line.lineTotal),
    ]),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [30, 30, 30], textColor: 255 },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
  });

  const finalY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 38;
  doc.setFontSize(10);
  doc.text(`${options.labels.totalQty}: ${batch.totalQty}`, margin, finalY + 10);
  doc.text(`${options.labels.totalValue}: ${formatMoney(batch.totalValue)}`, margin, finalY + 16);

  const filename = options.filename ?? buildReceiveStockPdfFilename(when);
  doc.save(filename);
  return filename;
}

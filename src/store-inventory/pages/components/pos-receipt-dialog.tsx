import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatMoney } from '@/store-inventory/lib/format';
import type { PosSaleRow } from '@/store-inventory/types';

export function PosReceiptDialog({
  open,
  onOpenChange,
  sale,
  storeName,
  currency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: PosSaleRow | null;
  storeName: string;
  currency: string;
}) {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md print:max-w-none print:shadow-none print:border-0">
        <DialogHeader className="print:hidden">
          <DialogTitle>Sale {sale.saleNumber}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div id="pos-receipt" className="space-y-4 text-sm">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-semibold">{storeName}</h2>
              <p className="text-muted-foreground">{sale.warehouseName} ({sale.warehouseCode})</p>
              <p className="text-muted-foreground">{format(new Date(sale.createdAt), 'd MMM yyyy, HH:mm')}</p>
            </div>
            <div className="border-y border-dashed py-3 space-y-1">
              <div className="flex justify-between">
                <span>Sale</span>
                <span className="font-medium">{sale.saleNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer</span>
                <span>{sale.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment</span>
                <span className="capitalize">{sale.paymentMethod}</span>
              </div>
            </div>
            <div className="space-y-2">
              {(sale.items ?? []).map((item) => (
                <div key={item.id} className="flex justify-between gap-3">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.quantity} × {formatMoney(item.unitPrice)} {item.sku}
                    </div>
                  </div>
                  <div>{formatMoney(item.lineTotal)}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-dashed pt-3 space-y-1">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatMoney(sale.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount</span>
                <span>-{formatMoney(sale.discountAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatMoney(sale.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>Total ({currency})</span>
                <span>{formatMoney(sale.total)}</span>
              </div>
              {sale.paymentMethod === 'cash' && (
                <>
                  <div className="flex justify-between">
                    <span>Tendered</span>
                    <span>{formatMoney(sale.amountTendered)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Change</span>
                    <span>{formatMoney(sale.changeDue)}</span>
                  </div>
                </>
              )}
            </div>
            {sale.notes && <p className="text-muted-foreground">Note: {sale.notes}</p>}
            <p className="text-center text-xs text-muted-foreground">Thank you for your purchase</p>
          </div>
        </DialogBody>
        <DialogFooter className="print:hidden">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button variant="mono" onClick={handlePrint}>
            Print receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

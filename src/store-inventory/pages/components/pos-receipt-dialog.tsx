import { format } from 'date-fns';
import { useT } from '@/i18n/use-t';
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
import { formatPaymentMethod } from '@/store-inventory/lib/payment-methods';
import { formatSaleWarehouses, groupSaleItemsByWarehouse } from '@/store-inventory/services/pos';
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
  const t = useT();
  if (!sale) return null;

  const warehouseGroups = groupSaleItemsByWarehouse(sale);
  const showWarehouseHeadings = warehouseGroups.length > 1;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md print:max-w-none print:shadow-none print:border-0">
        <DialogHeader className="print:hidden">
          <DialogTitle>{t('Sale {saleNumber}', { saleNumber: sale.saleNumber })}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div id="pos-receipt" className="space-y-4 text-sm">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-semibold">{storeName}</h2>
              <p className="text-muted-foreground">{formatSaleWarehouses(sale)}</p>
              <p className="text-muted-foreground">{format(new Date(sale.createdAt), 'd MMM yyyy, HH:mm')}</p>
            </div>
            <div className="border-y border-dashed py-3 space-y-1">
              <div className="flex justify-between">
                <span>{t('Sale')}</span>
                <span className="font-medium">{sale.saleNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('Customer')}</span>
                <span>{sale.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('Payment')}</span>
                <span>{t(formatPaymentMethod(sale.paymentMethod))}</span>
              </div>
            </div>
            <div className="space-y-4">
              {warehouseGroups.map((group) => (
                <div key={group.id || group.name} className="space-y-2">
                  {showWarehouseHeadings && (
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {group.code ? `${group.name} (${group.code})` : group.name}
                    </div>
                  )}
                  {group.items.map((item) => (
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
              ))}
            </div>
            <div className="border-t border-dashed pt-3 space-y-1">
              <div className="flex justify-between">
                <span>{t('Subtotal')}</span>
                <span>{formatMoney(sale.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>{sale.discountAmount > 0 ? t('Discount (cart)') : t('Discount')}</span>
                <span>-{formatMoney(sale.discountAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('Tax')}</span>
                <span>{formatMoney(sale.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>{t('Total ({currency})', { currency })}</span>
                <span>{formatMoney(sale.total)}</span>
              </div>
              {sale.paymentMethod === 'cash' && (
                <>
                  <div className="flex justify-between">
                    <span>{t('Tendered')}</span>
                    <span>{formatMoney(sale.amountTendered)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('Change due')}</span>
                    <span>{formatMoney(sale.changeDue)}</span>
                  </div>
                </>
              )}
              {sale.paymentMethod === 'account' && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('Paid from account')}</span>
                  <span>{formatMoney(sale.total)}</span>
                </div>
              )}
              {sale.paymentMethod === 'credit' && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('Bought on credit')}</span>
                  <span>{formatMoney(sale.total)}</span>
                </div>
              )}
            </div>
            {sale.notes && (
              <p className="text-muted-foreground">{t('Note: {notes}', { notes: sale.notes })}</p>
            )}
            <p className="text-center text-xs text-muted-foreground">{t('Thank you for your purchase')}</p>
          </div>
        </DialogBody>
        <DialogFooter className="print:hidden">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('Close')}
          </Button>
          <Button variant="mono" onClick={handlePrint}>
            {t('Print receipt')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

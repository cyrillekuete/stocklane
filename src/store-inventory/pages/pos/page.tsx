'use client';

import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, Search, ShoppingCart, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { isSupabaseConfigured } from '@/lib/supabase';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, InputWrapper } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCustomers } from '@/store-inventory/hooks/use-inventory';
import { useCompletePosSale, usePosCatalog } from '@/store-inventory/hooks/use-pos';
import { useStoreSettings } from '@/store-inventory/hooks/use-settings';
import { APP_CURRENCY, formatMoney, generateSaleNumber, parseMoney } from '@/store-inventory/lib/format';
import { isCustomerAccountPayment, POS_PAYMENT_METHODS } from '@/store-inventory/lib/payment-methods';
import { computePosTotals } from '@/store-inventory/services/pos';
import { fetchWarehouseStock } from '@/store-inventory/services/warehouses';
import { currentStockMockData } from '@/store-inventory/data/stock';
import { productListMockData } from '@/store-inventory/data/products';
import { warehouseListMockData } from '@/store-inventory/data/warehouses';
import type { PosCatalogProduct, PosPaymentMethod, PosSaleRow } from '@/store-inventory/types';
import { WarehouseSelect } from '../components/warehouse-select';
import { PosReceiptDialog } from '../components/pos-receipt-dialog';

type CartLine = {
  productId: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  name: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  available: number;
  image: string;
};

const mockCatalog: PosCatalogProduct[] = warehouseListMockData.flatMap((warehouse, warehouseIndex) =>
  productListMockData.map((product, index) => ({
    id: product.id,
    warehouseId: warehouse.id,
    warehouseName: warehouse.name,
    warehouseCode: warehouse.code,
    name: product.productInfo.title,
    sku: product.productInfo.label,
    barcode: product.barcode ?? '',
    image: product.productInfo.image,
    price: parseMoney(product.price),
    status: product.status.label,
    qty: Math.max(0, (currentStockMockData[index % currentStockMockData.length]?.stock ?? 10) - warehouseIndex * 4),
  })),
).filter((row) => row.qty > 0);

export function PosRegister() {
  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  const catalogQuery = usePosCatalog();
  const customersQuery = useCustomers();
  const settingsQuery = useStoreSettings();
  const completeSale = useCompletePosSale();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState<string>('walk-in');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>('cash');
  const [tendered, setTendered] = useState('');
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState<PosSaleRow | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const handleWarehouseChange = (next: string | null) => {
    setWarehouseId(next);
  };

  const settings = settingsQuery.data;
  const liveCatalog = catalogQuery.data;
  const allCatalog = isSupabaseConfigured ? (liveCatalog ?? []) : mockCatalog;
  const catalog = warehouseId
    ? allCatalog.filter((product) => product.warehouseId === warehouseId)
    : allCatalog;
  const customers = customersQuery.data ?? [];

  useEffect(() => {
    const stock = isSupabaseConfigured ? liveCatalog : mockCatalog;
    if (stock == null) return;
    setCart((current) => {
      let changed = false;
      const next = current.map((line) => {
        const product = stock.find(
          (row) => row.id === line.productId && row.warehouseId === line.warehouseId,
        );
        const available = product?.qty ?? 0;
        const quantity = Math.min(line.quantity, available);
        if (line.available === available && line.quantity === quantity) return line;
        changed = true;
        return { ...line, available, quantity };
      }).filter((line) => line.quantity > 0);
      return changed || next.length !== current.length ? next : current;
    });
  }, [liveCatalog]);

  const filteredCatalog = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = catalog.filter((product) => product.qty > 0);
    if (!query) return rows;
    return rows.filter((product) =>
      [product.name, product.sku, product.barcode].some((value) => value.toLowerCase().includes(query)),
    );
  }, [catalog, search]);

  const addToCart = (product: PosCatalogProduct) => {
    if (!product.warehouseId) {
      toast.error('Select a warehouse first');
      return;
    }
    setCart((current) => {
      const existing = current.find(
        (line) => line.productId === product.id && line.warehouseId === product.warehouseId,
      );
      if (existing) {
        if (existing.quantity >= product.qty) {
          toast.error('Not enough stock in this warehouse');
          return current;
        }
        return current.map((line) =>
          line.productId === product.id && line.warehouseId === product.warehouseId
            ? { ...line, quantity: line.quantity + 1, available: product.qty }
            : line,
        );
      }
      return [
        ...current,
        {
          productId: product.id,
          warehouseId: product.warehouseId,
          warehouseName: product.warehouseName,
          warehouseCode: product.warehouseCode,
          name: product.name,
          sku: product.sku,
          unitPrice: product.price,
          quantity: 1,
          available: product.qty,
          image: product.image,
        },
      ];
    });
    setSearch('');
  };

  const updateQty = (productId: string, lineWarehouseId: string, quantity: number) => {
    setCart((current) =>
      current
        .map((line) => {
          if (line.productId !== productId || line.warehouseId !== lineWarehouseId) return line;
          const next = Math.min(Math.max(quantity, 0), line.available);
          return { ...line, quantity: next };
        })
        .filter((line) => line.quantity > 0),
    );
  };

  const taxPercent = settings?.taxPercent ?? 20;
  const taxCalculation = settings?.taxCalculation ?? 'inclusive';
  const totals = computePosTotals({
    items: cart,
    discountPercent,
    taxPercent,
    taxCalculation,
  });
  const tenderedAmount = parseMoney(tendered);
  const changeDue = paymentMethod === 'cash' ? Math.max(tenderedAmount - totals.total, 0) : 0;
  const customer = customers.find((row) => row.id === customerId);
  const customerBalance = customer?.accountBalance ?? 0;
  const balanceAfterSale = customerBalance - totals.total;
  const chargesCustomerAccount = isCustomerAccountPayment(paymentMethod);
  const insufficientAccount =
    paymentMethod === 'account' && customerId !== 'walk-in' && balanceAfterSale < 0;
  const creditWouldGoNegative = paymentMethod === 'credit' && customerId !== 'walk-in' && balanceAfterSale < 0;

  const handleSearchKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    const match = filteredCatalog[0];
    if (match) addToCart(match);
  };

  const handleComplete = async () => {
    if (!cart.length) {
      toast.error('Add at least one item');
      return;
    }
    if (paymentMethod === 'cash' && tenderedAmount < totals.total) {
      toast.error('Amount tendered is less than the total');
      return;
    }
    if (chargesCustomerAccount && customerId === 'walk-in') {
      toast.error(
        paymentMethod === 'account'
          ? 'Select a customer to pay from their account'
          : 'Select a customer for credit sales',
      );
      return;
    }
    if (insufficientAccount) {
      toast.error('Not enough account balance for this sale');
      return;
    }

    const saleWarehouse = cart[0];
    const saleWarehouseId = saleWarehouse.warehouseId;

    try {
      if (isSupabaseConfigured) {
        const otherWarehouseIds = [...new Set(cart.map((line) => line.warehouseId))].filter(
          (id) => !allCatalog.some((product) => product.warehouseId === id),
        );
        const stockByWarehouse = new Map<string, Map<string, number>>();
        for (const product of allCatalog) {
          let qtyByProduct = stockByWarehouse.get(product.warehouseId);
          if (!qtyByProduct) {
            qtyByProduct = new Map();
            stockByWarehouse.set(product.warehouseId, qtyByProduct);
          }
          qtyByProduct.set(product.id, product.qty);
        }
        await Promise.all(
          otherWarehouseIds.map(async (id) => {
            const rows = await fetchWarehouseStock(id);
            stockByWarehouse.set(id, new Map(rows.map((row) => [row.productId, row.qty])));
          }),
        );
        const unavailable = cart.some((line) => {
          const qty = stockByWarehouse.get(line.warehouseId)?.get(line.productId);
          return qty == null || line.quantity > qty;
        });
        if (unavailable) {
          toast.error('Cart items are not available in their source warehouses');
          return;
        }
      } else {
        const unavailable = cart.some((line) => line.quantity > line.available);
        if (unavailable) {
          toast.error('Cart items are not available in their source warehouses');
          return;
        }
      }

      const saleNumber = generateSaleNumber();
      const payload = {
        saleNumber,
        warehouseId: saleWarehouseId,
        customerId: customerId === 'walk-in' ? null : customerId,
        customerName: customer?.customerInfo.title ?? 'Walk-in',
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        total: totals.total,
        paymentMethod,
        amountTendered: paymentMethod === 'cash' ? tenderedAmount : totals.total,
        changeDue,
        notes,
        items: cart.map((line) => ({
          productId: line.productId,
          warehouseId: line.warehouseId,
          sku: line.sku,
          name: line.name,
          unitPrice: line.unitPrice,
          quantity: line.quantity,
          lineTotal: line.unitPrice * line.quantity,
        })),
      };

      let sale: PosSaleRow | null = null;
      if (isSupabaseConfigured) {
        sale = await completeSale.mutateAsync(payload);
      } else {
        sale = {
          id: crypto.randomUUID(),
          saleNumber,
          warehouseId: saleWarehouseId,
          warehouseName: saleWarehouse.warehouseName,
          warehouseCode: saleWarehouse.warehouseCode,
          customerId: payload.customerId,
          customerName: payload.customerName,
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          taxAmount: totals.taxAmount,
          total: totals.total,
          paymentMethod,
          amountTendered: payload.amountTendered,
          changeDue,
          notes,
          status: 'completed',
          itemCount: cart.length,
          createdAt: new Date().toISOString(),
          items: cart.map((line) => ({
            id: crypto.randomUUID(),
            saleId: '',
            productId: line.productId,
            warehouseId: line.warehouseId,
            warehouseName: line.warehouseName,
            warehouseCode: line.warehouseCode,
            sku: line.sku,
            name: line.name,
            unitPrice: line.unitPrice,
            quantity: line.quantity,
            lineDiscount: 0,
            lineTotal: line.unitPrice * line.quantity,
          })),
        };
      }
      toast.success(`Sale ${saleNumber} completed`);
      setReceipt(sale);
      setReceiptOpen(true);
      setCart([]);
      setDiscountPercent(0);
      setTendered('');
      setNotes('');
      setCustomerId('walk-in');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to complete sale');
    }
  };

  return (
    <div className="container-fluid space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-foreground">Point of Sale</h3>
          <p className="text-sm text-muted-foreground">Sell inventory from one or more warehouses in a single sale.</p>
        </div>
        <div className="flex items-center gap-2">
          <WarehouseSelect allowAll value={warehouseId} onValueChange={handleWarehouseChange} />
          <Button variant="outline" asChild>
            <Link to="/store-inventory/pos/sales">Sale history</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="py-3.5">
            <div className="flex w-full items-center gap-2">
              <InputWrapper className="flex-1">
                <Search />
                <Input
                  placeholder="Search name, SKU, or barcode"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleSearchKey}
                />
              </InputWrapper>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-22rem)]">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pr-2">
                {filteredCatalog.map((product) => (
                  <button
                    key={`${product.id}:${product.warehouseId}`}
                    type="button"
                    onClick={() => addToCart(product)}
                    className="rounded-lg border border-border bg-accent/30 p-3 text-left hover:border-primary/40 hover:bg-accent/60"
                  >
                    <div className="mb-2 flex h-20 items-center justify-center rounded-md bg-background">
                      <img
                        src={toAbsoluteUrl(`/media/store/client/1200x1200/${product.image}`)}
                        alt={product.name}
                        className="h-16 object-contain"
                      />
                    </div>
                    <div className="text-sm font-medium leading-5 line-clamp-2">{product.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {product.warehouseName} ({product.warehouseCode})
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{product.sku}</span>
                      <span>{product.qty} in stock</span>
                    </div>
                    <div className="mt-1 text-sm font-semibold">{formatMoney(product.price)}</div>
                  </button>
                ))}
                {!filteredCatalog.length && (
                  <div className="col-span-full py-10 text-center text-sm text-muted-foreground">
                    No sellable stock{warehouseId ? ' in this warehouse' : ''}.
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3.5">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="size-4" />
              Cart
              <Badge variant="outline">{cart.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-[220px] pr-2">
              <div className="space-y-3">
                {cart.map((line) => (
                  <div key={`${line.productId}:${line.warehouseId}`} className="flex items-start justify-between gap-3 border-b border-border pb-3">
                    <div>
                      <div className="text-sm font-medium">{line.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatMoney(line.unitPrice)} · {line.warehouseName} ({line.warehouseCode})
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="size-7" onClick={() => updateQty(line.productId, line.warehouseId, line.quantity - 1)}>
                        <Minus className="size-3" />
                      </Button>
                      <span className="w-6 text-center text-sm">{line.quantity}</span>
                      <Button variant="outline" size="icon" className="size-7" onClick={() => updateQty(line.productId, line.warehouseId, line.quantity + 1)}>
                        <Plus className="size-3" />
                      </Button>
                      <Button variant="dim" size="icon" className="size-7" onClick={() => updateQty(line.productId, line.warehouseId, 0)}>
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {!cart.length && <p className="py-8 text-center text-sm text-muted-foreground">Cart is empty</p>}
              </div>
            </ScrollArea>

            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">Walk-in</SelectItem>
                  {customers.map((row) => (
                    <SelectItem key={row.id} value={row.id}>
                      {row.customerInfo.title} · {formatMoney(row.accountBalance ?? 0)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Discount %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Payment</Label>
                <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PosPaymentMethod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POS_PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {paymentMethod === 'cash' && (
              <div className="space-y-2">
                <Label>Amount tendered</Label>
                <Input value={tendered} onChange={(e) => setTendered(e.target.value)} placeholder={String(totals.total)} />
              </div>
            )}

            {chargesCustomerAccount && customerId === 'walk-in' && (
              <p className="text-xs text-destructive">
                Select a customer to {paymentMethod === 'account' ? 'pay from their account' : 'sell on credit'}.
              </p>
            )}

            {chargesCustomerAccount && customerId !== 'walk-in' && (
              <div className="space-y-1 rounded-md bg-accent/50 p-3 text-sm">
                <div className="flex justify-between">
                  <span>Account balance</span>
                  <span className={customerBalance < 0 ? 'text-destructive' : undefined}>
                    {formatMoney(customerBalance)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>After this sale</span>
                  <span className={balanceAfterSale < 0 ? 'text-destructive font-medium' : 'font-medium'}>
                    {formatMoney(balanceAfterSale)}
                  </span>
                </div>
                {paymentMethod === 'account' && (
                  <p className="pt-1 text-xs text-muted-foreground">
                    The sale total will be deducted from this customer&apos;s account.
                  </p>
                )}
                {insufficientAccount && (
                  <p className="pt-1 text-xs text-destructive">
                    Not enough account balance. Use Credit to sell now and collect later.
                  </p>
                )}
                {paymentMethod === 'credit' && (
                  <p className="pt-1 text-xs text-muted-foreground">
                    Recorded as bought on credit. The customer will pay later.
                  </p>
                )}
                {creditWouldGoNegative && (
                  <p className="pt-1 text-xs text-destructive">
                    This sale will put the account in the red. The customer will owe the shop.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>

            <div className="space-y-1 rounded-md bg-accent/50 p-3 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatMoney(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount</span>
                <span>-{formatMoney(totals.discountAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax ({taxPercent}%)</span>
                <span>{formatMoney(totals.taxAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatMoney(totals.total)}</span>
              </div>
              {paymentMethod === 'cash' && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Change</span>
                  <span>{formatMoney(changeDue)}</span>
                </div>
              )}
            </div>

            <Button className="w-full" variant="mono" onClick={handleComplete} disabled={completeSale.isPending}>
              Complete sale
            </Button>
          </CardContent>
        </Card>
      </div>

      <PosReceiptDialog
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        sale={receipt}
        storeName={settings?.storeName ?? 'Store'}
        currency={settings?.currency ?? APP_CURRENCY}
      />
    </div>
  );
}

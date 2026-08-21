'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, TrendingUp } from 'lucide-react';
import { Link } from 'react-router';
import { useT } from '@/i18n/use-t';
import { formatMoney, parseMoney } from '@/store-inventory/lib/format';
import type { OrderListRow } from '@/store-inventory/types';

export function RecentOrders({
  orders = [],
  average = 0,
}: {
  orders?: OrderListRow[];
  average?: number;
}) {
  const t = useT();
  const recent = orders.slice(0, 3);
  const total = recent.reduce((sum, order) => sum + parseMoney(order.total), 0);

  return (
    <Card className="bg-accent/70 rounded-md shadow-none">
      <CardContent className="p-0 flex flex-col h-full">
        <h3 className="text-sm font-medium text-foreground py-2.5 ps-2">{t('Recent Orders')}</h3>
        <div className="bg-background rounded-md m-1 mt-0 border border-input py-5 px-3.5 flex flex-col justify-between h-full">
          <div className="space-y-6 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center rounded-md bg-background border border-border size-[36px] shrink-0">
                  <div className="flex items-center justify-center bg-accent/50 rounded-md size-[30px]">
                    <ShoppingCart className="w-5 h-5 fill-indigo-600 text-indigo-600" />
                  </div>
                </div>
                <span className="text-2xl leading-[22px] font-semibold">
                  {formatMoney(total)}
                </span>
              </div>
              <Badge variant="success" size="sm" appearance="light">
                <TrendingUp className="w-3 h-3 mr-1" />
                {average ? Math.min(99, Math.round((total / Math.max(average, 1)) * 10) / 10) : 0}%
              </Badge>
              <span className="text-xs font-normal text-secondary-foreground/70">{t('vs AOV')}</span>
            </div>
            <div className="flex items-center gap-1">
              {recent.length ? (
                recent.map((order) => (
                  <div key={order.id} className="flex flex-col gap-3 flex-1">
                    <Progress className="w-full h-1.5 bg-secondary-foreground/30 rounded-sm" />
                    <span className="text-2sm font-medium text-foreground">{order.total}</span>
                  </div>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">{t('No recent orders')}</span>
              )}
            </div>
          </div>
          <div>
            {recent.map((order, index) => (
              <div key={order.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <Link to="/store-inventory/order-details" className="text-sm font-medium text-foreground hover:text-primary leading-3.5 text-left">
                      {order.order}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {order.date} · {order.category || t('Order')}
                    </span>
                  </div>
                  <Button variant="outline" size="sm">
                    {order.total}
                  </Button>
                </div>
                {index < recent.length - 1 && <Separator className="my-3.5" />}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

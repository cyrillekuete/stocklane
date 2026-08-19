/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export type StatisticItem = {
  total: string;
  label: string;
  badgeLabel: string;
  badgeColor: string;
  text: string;
  number?: string;
  icon?: 'up' | 'down';
  valueClassName?: string;
};

const defaultItems: StatisticItem[] = [
  { total: '0', label: 'Total Orders', badgeLabel: '0', badgeColor: 'success', text: 'Annual trend', icon: 'up' },
  { total: '$0.00', label: 'Cumulative Spend', badgeLabel: '0', badgeColor: 'success', text: 'Monthly trend', icon: 'up' },
  { total: '$0.00', label: 'Avg. Order Value(AOV)', badgeLabel: '0', badgeColor: 'destructive', text: 'Weekly trend', icon: 'down' },
  { total: '$0.00', label: 'Account Balance', badgeLabel: '0', badgeColor: 'success', text: 'Daily trend', icon: 'up' },
];

export function Statistics1({ items = defaultItems }: { items?: StatisticItem[] }) {
  return (
    <Card className="rounded-md mb-5 bg-accent/70 p-1">
      <CardContent className="rounded-md p-0 bg-background border border-border">
        <div className="grid md:grid-cols-4 lg:gap-5">
          {items.map((item, index) => (
            <div key={item.label} className={`flex flex-col justify-between gap-5 p-4.5 pb-3.5 ${index > 0 ? 'md:border-s border-border' : ''}`}>
              <div className="flex flex-col gap-0.5">
                <span className={`text-xl lg:text-2xl font-semibold ${item.valueClassName ?? 'text-foreground'}`}>
                  {item.total}
                  <span className="text-xl lg:text-2xl font-semibold text-secondary-foreground/30">{item.number}</span>
                </span>
                <span className="text-xs font-normal text-secondary-foreground/70">{item.label}</span>
              </div>
              <div className="flex items-center flex-wrap gap-1.5">
                <Badge variant={item.badgeColor as any} size="sm" appearance="light" className="w-fit">
                  {item.icon === 'down' ? <TrendingDown /> : <TrendingUp />} {item.badgeLabel}%
                </Badge>
                <span className="text-xs font-normal text-secondary-foreground">{item.text}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

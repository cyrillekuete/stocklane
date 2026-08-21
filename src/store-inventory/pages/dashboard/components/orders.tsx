import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useT } from '@/i18n/use-t';
import { formatMoney } from '@/store-inventory/lib/format';

interface IOrdersProps {
  className?: string;
}

const Orders = ({ className }: IOrdersProps) => {
  const t = useT();
  const [activePeriod, setActivePeriod] = useState('14D');

  const getDataForPeriod = (period: string) => {
    switch (period) {
      case '1H':
        return [
          { name: '00:00', value: 45 },
          { name: '01:00', value: 35 },
          { name: '02:00', value: 45 },
          { name: '03:00', value: 35 },
          { name: '04:00', value: 55 },
          { name: '05:00', value: 85 },
          { name: '06:00', value: 20 },
          { name: '07:00', value: 25 },
          { name: '08:00', value: 55 },
        ];
      case '1D':
        return [
          { name: t('Mon'), value: 25 },
          { name: t('Tue'), value: 55 },
          { name: t('Wed'), value: 65 },
          { name: t('Thu'), value: 45 },
          { name: t('Fri'), value: 25 },
          { name: t('Sat'), value: 65 },
          { name: t('Sun'), value: 50 },
          { name: t('Mon'), value: 40 },
          { name: t('Tue'), value: 60 },
        ];
      case '14D':
        return [
          { name: t('Sep 8'), value: 95 },
          { name: t('Sep 9'), value: 70 },
          { name: t('Sep 10'), value: 85 },
          { name: t('Sep 11'), value: 60 },
          { name: t('Sep 12'), value: 80 },
          { name: t('Sep 13'), value: 50 },
          { name: t('Sep 14'), value: 90 },
          { name: t('Sep 15'), value: 60 },
          { name: t('Sep 16'), value: 85 },
          { name: t('Sep 17'), value: 55 },
          { name: t('Sep 18'), value: 75 },
          { name: t('Sep 19'), value: 45 },
          { name: t('Sep 20'), value: 80 },
          { name: t('Sep 21'), value: 70 },
          { name: t('Sep 22'), value: 65 },
          { name: t('Sep 23'), value: 75 },
        ];
      case '1M':
        return [
          { name: t('Jan'), value: 20 },
          { name: t('Feb'), value: 65 },
          { name: t('Mar'), value: 20 },
          { name: t('Apr'), value: 50 },
          { name: t('May'), value: 70 },
          { name: t('Jun'), value: 25 },
          { name: t('Jul'), value: 40 },
          { name: t('Aug'), value: 60 },
          { name: t('Sep'), value: 80 },
        ];
      case '3M':
        return [
          { name: t('Q1'), value: 45 },
          { name: t('Q2'), value: 35 },
          { name: t('Q3'), value: 45 },
          { name: t('Q4'), value: 35 },
          { name: t('Q1'), value: 55 },
          { name: t('Q2'), value: 85 },
          { name: t('Q3'), value: 20 },
          { name: t('Q4'), value: 25 },
          { name: t('Q1'), value: 55 },
        ];
      case '1Y':
        return [
          { name: '2022', value: 25 },
          { name: '2023', value: 55 },
          { name: '2024', value: 65 },
          { name: '2025', value: 45 },
          { name: '2026', value: 25 },
          { name: '2027', value: 65 },
          { name: '2028', value: 50 },
          { name: '2029', value: 40 },
          { name: '2030', value: 60 },
        ];
      case 'All':
        return [
          { name: '2020', value: 80 },
          { name: '2021', value: 40 },
          { name: '2022', value: 50 },
          { name: '2023', value: 20 },
          { name: '2024', value: 50 },
          { name: '2025', value: 80 },
          { name: '2026', value: 60 },
          { name: '2027', value: 20 },
          { name: '2028', value: 30 },
        ];
      default:
        return [];
    }
  };

  const data = getDataForPeriod(activePeriod);

  const customTooltip: TooltipProps<number, string>['content'] = ({
    active,
    payload,
    label,
  }) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      return (
        <div className="flex flex-col gap-2 p-3.5 bg-background border border-border rounded-lg shadow-lg">
          <div className="font-medium text-sm text-secondary-foreground">
            {t('{label}, 2025 Sales', { label })}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="font-semibold text-base text-mono">{value}</div>
            <Badge size="sm" variant="success" appearance="light">
              +24%
            </Badge>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t('Orders')}</CardTitle>
        <Button mode="link" underline="solid" asChild>
          <Link to="#">{t('See All')}</Link>
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col justify-between gap-2 p-0 lg:pt-7.5 pt-5">
        <div>
          <ToggleGroup
            type="single"
            variant="outline"
            value={activePeriod}
            onValueChange={(value) => {
              if (value) setActivePeriod(value);
            }}
            className="grid grid-cols-7 mb-6 mx-5 lg:mx-7.5 !data-[variant=outline]:shadow-none"
          >
            {['1H', '1D', '14D', '1M', '3M', '1Y', 'All'].map((period) => (
              <ToggleGroupItem className="h-[28px]" key={period} value={period}>
                {period === 'All' ? t('All') : period}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <div className="flex items-center gap-2.5 px-5 lg:px-7.5 mb-1.5">
            <span className="text-3xl font-semibold text-foreground">
              {formatMoney(9395.72)}
            </span>
            <Badge size="sm" variant="success" appearance="light">
              +4.7%
            </Badge>
          </div>
        </div>

        <div className="h-48 w-full px-0 mb-5">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{
                top: 10,
                right: 30,
                left: 30,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient id="orderGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--primary)"
                    stopOpacity={0.25}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--primary)"
                    stopOpacity={0}
                  />
                </linearGradient>
                <filter
                  id="dotShadow"
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                >
                  <feDropShadow
                    dx="0"
                    dy="1"
                    stdDeviation="2"
                    floodColor="var(--primary)"
                    floodOpacity="0.3"
                  />
                </filter>
              </defs>
              <CartesianGrid
                strokeDasharray="5 5"
                stroke="var(--border)"
                horizontal={true}
                vertical={false}
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{
                  fontSize: 12,
                  fill: 'var(--muted-foreground)',
                  textAnchor: 'middle',
                }}
                tickFormatter={
                  activePeriod === '14D'
                    ? (value: string) => {
                        const visibleDates = [
                          t('Sep 8'),
                          t('Sep 13'),
                          t('Sep 18'),
                          t('Sep 23'),
                        ];
                        return visibleDates.includes(value) ? value : '';
                      }
                    : undefined
                }
              />
              <YAxis hide domain={[0, 100]} />
              <Tooltip content={customTooltip} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--primary)"
                fill="url(#orderGradient)"
                strokeWidth={3}
                dot={false}
                activeDot={{
                  r: 6,
                  fill: 'var(--primary)',
                  stroke: 'white',
                  strokeWidth: 2,
                  filter: 'url(#dotShadow)',
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export { Orders, type IOrdersProps };

import { useT } from '@/i18n/use-t';
import { StockHistoryTable } from '../tables/stock-history';

export function StockHistory() {
  const t = useT();
  return (
    <div className="container-fluid space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">{t('Stock history')}</h1>
      <StockHistoryTable />
    </div>
  );
}

import { useT } from '@/i18n/use-t';
import { StockEntryForm } from '../components/stock-entry-form';

export function StockEntryPage() {
  const t = useT();
  return (
    <div className="container-fluid space-y-5 lg:space-y-9">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-foreground">{t('Stock Entry')}</h1>
        <span className="text-sm text-muted-foreground">
          {t('Set initial stock, add purchased quantities, or adjust on-hand amounts.')}
        </span>
      </div>
      <StockEntryForm />
    </div>
  );
}

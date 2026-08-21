import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/use-t';
import { usePosSales } from '@/store-inventory/hooks/use-pos';
import { PosSalesTable } from '../tables/pos-sales';

export function PosSalesPage() {
  const t = useT();
  const { data } = usePosSales();

  return (
    <div className="container-fluid space-y-5 lg:space-y-9">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-foreground">{t('POS Sales')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('Completed checkout history. Voiding a sale restocks the warehouse.')}
          </p>
        </div>
        <Button variant="mono" asChild>
          <Link to="/store-inventory/pos">{t('Open register')}</Link>
        </Button>
      </div>
      <PosSalesTable mockData={data} />
    </div>
  );
}

import { Helmet } from 'react-helmet-async';
import { useT } from '@/i18n/use-t';
import { WarehouseFilterProvider } from '../lib/warehouse-filter';
import { LayoutProvider } from './components/context';
import { Main } from './components/main';

export function DefaultLayout() {
  const t = useT();
  return (
    <>
      <Helmet>
        <title>{t('Stocklane - Store Inventory')}</title>
      </Helmet>

      <LayoutProvider>
        <WarehouseFilterProvider>
          <Main />
        </WarehouseFilterProvider>
      </LayoutProvider>
    </>
  );
}

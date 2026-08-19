import { Helmet } from 'react-helmet-async';
import { WarehouseFilterProvider } from '../lib/warehouse-filter';
import { LayoutProvider } from './components/context';
import { Main } from './components/main';

export function DefaultLayout() {
  return (
    <>
      <Helmet>
        <title>Metronic - Store Inventory</title>
      </Helmet>

      <LayoutProvider>
        <WarehouseFilterProvider>
          <Main />
        </WarehouseFilterProvider>
      </LayoutProvider>
    </>
  );
}

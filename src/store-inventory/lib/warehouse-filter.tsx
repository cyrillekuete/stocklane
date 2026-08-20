import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useActiveWarehouses } from '../hooks/use-warehouses';

type WarehouseFilterContextValue = {
  warehouseId: string | null;
  setWarehouseId: (id: string | null) => void;
};

const WarehouseFilterContext = createContext<WarehouseFilterContextValue | null>(null);

function WarehouseFilterHygiene() {
  const { warehouseId, setWarehouseId } = useWarehouseFilter();
  const { data: activeWarehouses } = useActiveWarehouses();

  useEffect(() => {
    if (!warehouseId) return;
    if (!activeWarehouses) return;
    if (!activeWarehouses.some((row) => row.id === warehouseId)) {
      setWarehouseId(null);
    }
  }, [warehouseId, activeWarehouses, setWarehouseId]);

  return null;
}

export function WarehouseFilterProvider({ children }: { children: ReactNode }) {
  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  const value = useMemo(() => ({ warehouseId, setWarehouseId }), [warehouseId]);
  return (
    <WarehouseFilterContext.Provider value={value}>
      <WarehouseFilterHygiene />
      {children}
    </WarehouseFilterContext.Provider>
  );
}

export function useWarehouseFilter() {
  const context = useContext(WarehouseFilterContext);
  if (!context) {
    return {
      warehouseId: null,
      setWarehouseId: () => undefined,
    };
  }
  return context;
}

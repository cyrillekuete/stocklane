import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type WarehouseFilterContextValue = {
  warehouseId: string | null;
  setWarehouseId: (id: string | null) => void;
};

const WarehouseFilterContext = createContext<WarehouseFilterContextValue | null>(null);

export function WarehouseFilterProvider({ children }: { children: ReactNode }) {
  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  const value = useMemo(() => ({ warehouseId, setWarehouseId }), [warehouseId]);
  return <WarehouseFilterContext.Provider value={value}>{children}</WarehouseFilterContext.Provider>;
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

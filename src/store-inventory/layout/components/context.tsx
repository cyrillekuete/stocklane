import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

type SidebarTheme = 'dark' | 'light';

interface LayoutState {
  sidebarCollapse: boolean;
  setSidebarCollapse: (open: boolean) => void;
  sidebarTheme: SidebarTheme;
  setSidebarTheme: (theme: SidebarTheme) => void;
}

const LayoutContext = createContext<LayoutState | undefined>(undefined);

interface LayoutProviderProps {
  children: ReactNode;
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const [sidebarCollapse, setSidebarCollapse] = useState(false);
  const [sidebarTheme, setSidebarTheme] = useState<SidebarTheme>('light');

  const value = useMemo(
    () => ({
      sidebarCollapse,
      setSidebarCollapse,
      sidebarTheme,
      setSidebarTheme,
    }),
    [sidebarCollapse, sidebarTheme],
  );

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};

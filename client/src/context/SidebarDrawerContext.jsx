import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

const SidebarDrawerContext = createContext(null);

export function SidebarDrawerProvider({ children }) {
  const [open, setOpen] = useState(typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1024px)').matches);
  const { pathname } = useLocation();
  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((p) => !p), []);

  useEffect(() => {
    if (window.matchMedia('(max-width: 1023px)').matches) close();
  }, [pathname, close]);

  const value = useMemo(() => ({ open, close, toggle }), [open, close, toggle]);
  return <SidebarDrawerContext.Provider value={value}>{children}</SidebarDrawerContext.Provider>;
}

export function useSidebarDrawer() {
  const ctx = useContext(SidebarDrawerContext);
  if (!ctx) throw new Error('useSidebarDrawer must be used within SidebarDrawerProvider');
  return ctx;
}

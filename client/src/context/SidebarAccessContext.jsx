import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSessionAuth } from '@/context/SessionAuthContext';
import { getSidebarData } from '@/services/processReportService';
import { MAIN_PROFILE } from '@/lib/dashboardPaths';
import { onAppRefresh } from '@/lib/appRefresh';

const PATH_ALIASES = {
  '/dashboard/qa-qc/civil': '/dashboard/qa-qc/civil-structural',
  '/dashboard/qa-qc/general': '/dashboard/qa-qc/general-discipline',
};

const ALWAYS_OPEN = new Set([
  '/dashboard',
  '/dashboard/qa-qc',
  '/dashboard/profile',
  '/dashboard/settings',
  '/dashboard/system-status',
  '/dashboard/audit-log',
  '/dashboard/qa-qc/user-activity',
  '/dashboard/qa-qc/templates',
]);

const ADMIN_PATHS = new Set([
  '/dashboard/users',
  '/dashboard/roles',
  '/dashboard/permissions',
  '/dashboard/env-settings',
  '/dashboard/audit-reports',
  '/dashboard/system-logs',
  '/dashboard/api-docs',
]);

const SidebarAccessContext = createContext(null);

export function SidebarAccessProvider({ children }) {
  const { user } = useSessionAuth();
  const [sections, setSections] = useState([]);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    try {
      const next = await getSidebarData();
      setSections(Array.isArray(next) ? next : []);
    } catch {
      setSections([]);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    setReady(false);
    reload();
  }, [reload, user?.user_id]);

  useEffect(() => {
    const onFocus = () => reload();
    window.addEventListener('focus', onFocus);
    const stop = onAppRefresh(reload);
    return () => {
      window.removeEventListener('focus', onFocus);
      stop();
    };
  }, [reload]);

  const isMaster = Number(user?.role_id) === 1;
  const allowedPaths = useMemo(() => {
    const set = new Set();
    sections.forEach((section) => {
      (section.items || []).forEach((item) => {
        if (item?.path) set.add(item.path);
      });
    });
    return set;
  }, [sections]);

  const firstPath = useMemo(() => {
    for (const section of sections) {
      const path = section.items?.[0]?.path;
      if (path) return path;
    }
    return MAIN_PROFILE;
  }, [sections]);

  const canAccess = useCallback((pathname) => {
    const path = String(pathname || '').replace(/\/$/, '') || '/';
    if (ALWAYS_OPEN.has(path)) return true;
    if (isMaster && ADMIN_PATHS.has(path)) return true;
    if (allowedPaths.has(path)) return true;
    const canonical = PATH_ALIASES[path];
    if (canonical && allowedPaths.has(canonical)) return true;
    return false;
  }, [allowedPaths, isMaster]);

  const value = useMemo(
    () => ({ sections, ready, reload, isMaster, allowedPaths, firstPath, canAccess }),
    [sections, ready, reload, isMaster, allowedPaths, firstPath, canAccess],
  );

  return <SidebarAccessContext.Provider value={value}>{children}</SidebarAccessContext.Provider>;
}

export function useSidebarAccess() {
  const ctx = useContext(SidebarAccessContext);
  if (!ctx) throw new Error('useSidebarAccess must be used within SidebarAccessProvider');
  return ctx;
}

export function DashboardHome() {
  const { ready, firstPath } = useSidebarAccess();
  if (!ready) {
    return <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">Loading workspace…</div>;
  }
  return <Navigate to={firstPath} replace />;
}

export function SidebarGate({ children }) {
  const { pathname } = useLocation();
  const { ready, canAccess, firstPath } = useSidebarAccess();
  if (!ready) {
    return <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">Loading workspace…</div>;
  }
  if (canAccess(pathname)) return children;
  return <Navigate to={firstPath} replace />;
}

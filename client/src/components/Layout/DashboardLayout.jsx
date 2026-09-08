import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Dashboard/Sidebar';
import Topbar from '@/components/Layout/Topbar';
import SidebarDrawer from '@/components/Layout/SidebarDrawer';
import { SidebarDrawerProvider } from '@/context/SidebarDrawerContext';
import { SidebarAccessProvider, SidebarGate } from '@/context/SidebarAccessContext';
import { useSessionAuth } from '@/context/SessionAuthContext';
import { useDashboardTheme } from '@/lib/useDashboardTheme';
import { applyRoleTheme, clearRoleTheme, roleThemeFromUser } from '@/lib/theme';

export default function DashboardLayout() {
  useDashboardTheme();
  const { user } = useSessionAuth();

  useEffect(() => {
    applyRoleTheme(roleThemeFromUser(user));
    return () => clearRoleTheme();
  }, [user]);

  return (
    <SidebarAccessProvider>
      <SidebarDrawerProvider>
        <div className="flex h-screen overflow-hidden bg-background text-foreground">
          <SidebarDrawer widthClass="w-64">
            <Sidebar />
          </SidebarDrawer>
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Topbar />
            <main className="min-h-0 flex-1 overflow-y-auto bg-background">
              <SidebarGate>
                <Outlet />
              </SidebarGate>
            </main>
            <footer className="border-t border-border bg-card px-4 py-2 text-center text-[11px] text-muted-foreground">
              Petrolenz QA/QC · AI-powered EPC project intelligence · © 2026
            </footer>
          </div>
        </div>
      </SidebarDrawerProvider>
    </SidebarAccessProvider>
  );
}

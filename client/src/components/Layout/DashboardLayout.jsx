import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Dashboard/Sidebar';
import Topbar from '@/components/Layout/Topbar';
import SidebarDrawer from '@/components/Layout/SidebarDrawer';
import { SidebarDrawerProvider } from '@/context/SidebarDrawerContext';
import { useDashboardTheme } from '@/lib/useDashboardTheme';

export default function DashboardLayout() {
  useDashboardTheme();
  return (
    <SidebarDrawerProvider>
      <div className="flex h-screen overflow-hidden bg-[#F2F6FF] text-gray-900 dark:bg-dash-bg dark:text-dash-text">
        <SidebarDrawer widthClass="w-64">
          <Sidebar />
        </SidebarDrawer>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="min-h-0 flex-1 overflow-y-auto">
            <Outlet />
          </main>
          <footer className="border-t border-[#c4d2f0] px-4 py-2 text-center text-[11px] text-[#7a8794] dark:border-[#2a3548] dark:text-slate-400">
            Petrolenz — AI-powered EPC project intelligence — © 2026
          </footer>
        </div>
      </div>
    </SidebarDrawerProvider>
  );
}

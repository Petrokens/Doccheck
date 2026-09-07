import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Moon, Sun, UserCircle2 } from 'lucide-react';
import SidebarMenuButton from '@/components/Layout/SidebarMenuButton';
import { getUserProfile, logoutUser } from '@/services/authService';
import { useSessionAuth } from '@/context/SessionAuthContext';
import { resolveIsDark, setThemeMode } from '@/lib/theme';
import { MAIN_PROFILE, MAIN_SETTINGS } from '@/lib/dashboardPaths';
import { BRAND_EYEBROW } from '@/lib/brandCopy';

export default function Topbar() {
  const navigate = useNavigate();
  const { logout } = useSessionAuth();
  const [user, setUser] = useState(null);
  const [dark, setDark] = useState(() => resolveIsDark());

  useEffect(() => {
    getUserProfile().then(setUser).catch(() => setUser(null));
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#c4d2f0] bg-white px-4 dark:border-dash-border dark:bg-dash-surface">
      <div className="flex items-center gap-3">
        <SidebarMenuButton />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a8794]">{BRAND_EYEBROW}</p>
          <p className="text-sm font-semibold text-[#0c2340] dark:text-dash-text">QA / QC Workspace</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const next = dark ? 'light' : 'dark';
            setThemeMode(next);
            setDark(resolveIsDark(next));
          }}
          className="rounded-lg border border-[#c4d2f0] p-2 dark:border-dash-border"
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <Link to={MAIN_PROFILE} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-[#eef2f7]">
          <UserCircle2 size={18} />
          {user?.username || 'Account'}
        </Link>
        <button
          type="button"
          className="rounded-lg border px-3 py-1.5 text-sm"
          onClick={async () => {
            await logout();
            await logoutUser();
            navigate('/login');
          }}
        >
          Logout
        </button>
        <Link to={MAIN_SETTINGS} className="hidden text-sm text-[#0B4D99] sm:inline">Settings</Link>
      </div>
    </header>
  );
}

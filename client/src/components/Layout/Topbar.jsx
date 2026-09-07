import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Moon, Sun, UserCircle2 } from 'lucide-react';
import SidebarMenuButton from '@/components/Layout/SidebarMenuButton';
import { useSessionAuth } from '@/context/SessionAuthContext';
import { resolveIsDark, setThemeMode } from '@/lib/theme';
import { MAIN_PROFILE, MAIN_SETTINGS } from '@/lib/dashboardPaths';
import { BRAND_EYEBROW } from '@/lib/brandCopy';

function formatGmtOffset(date) {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
  const minutes = String(Math.abs(offset) % 60).padStart(2, '0');
  return `GMT${sign}${hours}:${minutes}`;
}

export default function Topbar() {
  const navigate = useNavigate();
  const { logout, user } = useSessionAuth();
  const [dark, setDark] = useState(() => resolveIsDark());
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#c4d2f0] bg-white px-4 dark:border-[#2a3548] dark:bg-[#111827]">
      <div className="flex items-center gap-3">
        <SidebarMenuButton />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a8794] dark:text-slate-400">{BRAND_EYEBROW}</p>
          <p className="text-sm font-semibold text-[#0c2340] dark:text-white">QA / QC Workspace</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-[11px] text-[#7a8794] dark:text-slate-300">Timezone: {formatGmtOffset(now)}</p>
          <p className="text-xs font-medium tabular-nums text-[#0c2340] dark:text-white">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>
        <button
          type="button"
          aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={() => {
            const next = dark ? 'light' : 'dark';
            setThemeMode(next);
            setDark(resolveIsDark(next));
          }}
          className="rounded-lg border border-[#c4d2f0] p-2 text-[#0c2340] hover:bg-[#eef2f7] dark:border-[#3d4d66] dark:text-white dark:hover:bg-[#1e293b]"
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <Link to={MAIN_PROFILE} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-[#0c2340] hover:bg-[#eef2f7] dark:text-white dark:hover:bg-[#1e293b]">
          <UserCircle2 size={18} />
          {user?.username || 'Account'}
        </Link>
        <button
          type="button"
          className="rounded-lg border border-[#c4d2f0] px-3 py-1.5 text-sm text-[#0c2340] hover:bg-[#eef2f7] dark:border-[#3d4d66] dark:text-white dark:hover:bg-[#1e293b]"
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
        >
          Logout
        </button>
        <Link to={MAIN_SETTINGS} className="hidden text-sm font-medium text-[#0B4D99] dark:text-blue-400 sm:inline">Settings</Link>
      </div>
    </header>
  );
}

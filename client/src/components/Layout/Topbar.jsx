import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Settings, UserCircle2 } from 'lucide-react';
import SidebarMenuButton from '@/components/Layout/SidebarMenuButton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSessionAuth } from '@/context/SessionAuthContext';
import { MAIN_PROFILE, MAIN_SETTINGS } from '@/lib/dashboardPaths';
import { BRAND_EYEBROW, BRAND_TAGLINE } from '@/lib/brandCopy';
import brandIcon from '@/assets/logo.png';

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
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const initials = String(user?.username || 'A')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-white px-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-3">
        <SidebarMenuButton />
        <img src={brandIcon} alt="" className="hidden size-12 rounded-lg object-contain sm:block" />
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{BRAND_EYEBROW}</p>
          <p className="text-sm font-semibold leading-snug">{BRAND_TAGLINE}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden text-right sm:block">
          <p className="text-[11px] text-muted-foreground">Timezone: {formatGmtOffset(now)}</p>
          <p className="text-xs font-medium tabular-nums">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" className="gap-2 px-2">
              <Avatar size="sm">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline">{user?.username || 'Account'}</span>
            </Button>
          </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to={MAIN_PROFILE}>
                <UserCircle2 /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={MAIN_SETTINGS}>
                <Settings /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
            >
              <LogOut /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

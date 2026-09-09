import { NavLink } from 'react-router-dom';
import { useSidebarAccess } from '@/context/SidebarAccessContext';
import brandIcon from '@/assets/logo.png';
import { buttonVariants } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Activity, BookOpen, Building, Clock, Cog, Cpu, FileSearch, FileText, Flame,
  Info, Key, Layers, Lock, Megaphone, RadioTower, Route, Shield,
  Thermometer, Users, Wrench, Zap,
} from 'lucide-react';

const iconMap = {
  flame: Flame, wrench: Wrench, route: Route, building: Building, cog: Cog, cpu: Cpu,
  zap: Zap, thermometer: Thermometer, activity: Activity, radiotower: RadioTower,
  shield: Shield, layers: Layers, clock: Clock, info: Info, brain: Cpu,
  filetext: FileText, users: Users, key: Key, lock: Lock,
  filesearch: FileSearch, filecode: FileText, bookopen: BookOpen, megaphone: Megaphone,
};

const displayLabels = {
  'General Discipline': 'General',
  'AI QC Inbox': 'DocCheck Reports',
};

export default function Sidebar() {
  const { sections } = useSidebarAccess();

  return (
    <aside id="app-sidebar" className="flex h-full min-h-0 w-64 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[var(--shadow-card)]">
      <div className="shrink-0 px-4 py-4">
        <div className="flex items-center gap-3">
          <img
            src={brandIcon}
            alt=""
            className="size-9 shrink-0 rounded-md object-contain"
          />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold tracking-tight text-sidebar-primary">
              DocCheck AI
            </p>
            <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Engineering QA/QC
            </p>
          </div>
        </div>
      </div>
      <Separator className="shrink-0" />
      <ScrollArea className="min-h-0 flex-1 overflow-hidden">
        <nav className="px-3 py-3 pb-6">
          {sections
            .filter((section) => !['analytics', 'system'].includes(String(section.title || '').toLowerCase()))
            .filter((section) => section.items?.length)
            .map((section) => (
            <div key={section.id} className="mb-4">
              <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{section.title}</p>
              {section.items?.map((item) => {
                const Icon = iconMap[item.icon_key] || Layers;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        buttonVariants({ variant: isActive ? 'secondary' : 'ghost', size: 'sm' }),
                        'mb-0.5 h-8 w-full justify-start gap-2',
                      )
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {displayLabels[item.label] || item.label}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}

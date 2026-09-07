import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getSidebarData } from '@/services/processReportService';
import { BRAND_EYEBROW, BRAND_TAGLINE } from '@/lib/brandCopy';
import {
  Activity, Building, Clipboard, Clock, Cog, Cpu, FileSearch, FileText, Flame,
  Info, Key, Layers, Lock, PieChart, RadioTower, Route, Server, Shield, Sliders,
  Thermometer, TrendingUp, Users, Wrench, Zap,
} from 'lucide-react';

const iconMap = {
  flame: Flame, wrench: Wrench, route: Route, building: Building, cog: Cog, cpu: Cpu,
  zap: Zap, thermometer: Thermometer, activity: Activity, radiotower: RadioTower,
  shield: Shield, layers: Layers, clock: Clock, info: Info, brain: Cpu,
  filetext: FileText, trendingup: TrendingUp, clipboard: Clipboard, piechart: PieChart,
  server: Server, sliders: Sliders, users: Users, key: Key, lock: Lock,
  filesearch: FileSearch, filecode: FileText,
};

export default function Sidebar() {
  const [sections, setSections] = useState([]);
  useEffect(() => {
    getSidebarData().then(setSections).catch(() => setSections([]));
  }, []);

  return (
    <aside id="app-sidebar" className="flex h-screen w-64 flex-col border-r border-[#c4d2f0] bg-gradient-to-b from-[#edf3ff] via-[#eaf0ff] to-[#e2ebff] dark:border-dash-border dark:from-dash-surface dark:to-dash-bg">
      <div className="border-b border-[#c4d2f0] px-4 py-4 dark:border-dash-border">
        <div className="rounded-2xl border border-[#bfd4fb] bg-gradient-to-r from-[#f8fbff] to-[#e3efff] px-4 py-4 dark:border-dash-border dark:from-dash-surface-elevated">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#5874aa]">{BRAND_EYEBROW}</p>
          <p className="text-[1.35rem] font-black tracking-[0.08em] text-[#0B4D99] dark:text-blue-200">PETROLENZ</p>
          <p className="mt-1 text-[0.72rem] text-[#4f6490]">{BRAND_TAGLINE}</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {sections.map((section) => (
          <div key={section.id} className="mb-4">
            <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#7a8794]">{section.title}</p>
            {section.items?.map((item) => {
              const Icon = iconMap[item.icon_key] || Layers;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `mb-0.5 flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                      isActive
                        ? 'bg-[#DCEBFF] text-[#0B4D99] dark:bg-dash-accent dark:text-white'
                        : 'text-[#4a5563] hover:bg-[#F2F6FF] dark:text-dash-muted dark:hover:bg-dash-surface-elevated'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label === 'General Discipline' ? 'General' : item.label}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

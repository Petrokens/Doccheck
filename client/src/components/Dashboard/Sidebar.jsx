import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getSidebarData } from '@/services/processReportService';
import { BRAND_EYEBROW, BRAND_TAGLINE } from '@/lib/brandCopy';
import {
  Activity, BookOpen, Building, Clock, Cog, Cpu, FileSearch, FileText, Flame,
  Info, Key, Layers, Lock, RadioTower, Route, Shield,
  Thermometer, Users, Wrench, Zap,
} from 'lucide-react';

const iconMap = {
  flame: Flame, wrench: Wrench, route: Route, building: Building, cog: Cog, cpu: Cpu,
  zap: Zap, thermometer: Thermometer, activity: Activity, radiotower: RadioTower,
  shield: Shield, layers: Layers, clock: Clock, info: Info, brain: Cpu,
  filetext: FileText, users: Users, key: Key, lock: Lock,
  filesearch: FileSearch, filecode: FileText, bookopen: BookOpen,
};

export default function Sidebar() {
  const [sections, setSections] = useState([]);
  useEffect(() => {
    getSidebarData().then(setSections).catch(() => setSections([]));
  }, []);

  return (
    <aside id="app-sidebar" className="flex h-screen w-64 flex-col border-r border-[#c4d2f0] bg-[#edf3ff] dark:border-[#2a3548] dark:bg-[#111827]">
      <div className="border-b border-[#c4d2f0] px-4 py-4 dark:border-[#2a3548]">
        <div className="px-1 py-1">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#5874aa] dark:text-slate-400">{BRAND_EYEBROW}</p>
          <p className="text-[1.35rem] font-black tracking-[0.08em] text-[#0B4D99] dark:text-white">PETROLENZ</p>
          <p className="mt-1 text-[0.72rem] text-[#4f6490] dark:text-slate-300">{BRAND_TAGLINE}</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {sections
          .filter((section) => !['analytics', 'system'].includes(String(section.title || '').toLowerCase()))
          .filter((section) => section.items?.length)
          .map((section) => (
          <div key={section.id} className="mb-4">
            <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#7a8794] dark:text-slate-400">{section.title}</p>
            {section.items?.map((item) => {
              const Icon = iconMap[item.icon_key] || Layers;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `mb-0.5 flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                      isActive
                        ? 'bg-[#DCEBFF] text-[#0B4D99] dark:bg-blue-600 dark:text-white'
                        : 'text-[#4a5563] hover:bg-[#F2F6FF] dark:text-slate-100 dark:hover:bg-[#1e293b]'
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

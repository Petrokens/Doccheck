import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { logoutUser } from '@/services/authService';
import { getSidebarData } from '@/services/sidebarService';
import darkLogo from '@/assets/logo/dark.png';
import lightLogo from '@/assets/logo/light.png';

import {
  Layers, Clock, User, Settings, KeyRound, PlusCircle, LogOut,
  Brain, ClipboardList, BarChart, MessageSquare, UploadCloud,
  AlertCircle, History, FileText, TrendingUp, Clipboard,
  PieChart, Server, Sliders, Flame, Wrench, Route, Building,
  Cog, Cpu, Zap, Thermometer, Activity, RadioTower, Shield
} from 'lucide-react';

// Icon mapping
const iconMap = {
  flame: <Flame className="w-4 h-4 mr-2" />,
  wrench: <Wrench className="w-4 h-4 mr-2" />,
  route: <Route className="w-4 h-4 mr-2" />,
  building: <Building className="w-4 h-4 mr-2" />,
  cog: <Cog className="w-4 h-4 mr-2" />,
  cpu: <Cpu className="w-4 h-4 mr-2" />,
  zap: <Zap className="w-4 h-4 mr-2" />,
  thermometer: <Thermometer className="w-4 h-4 mr-2" />,
  activity: <Activity className="w-4 h-4 mr-2" />,
  radiotower: <RadioTower className="w-4 h-4 mr-2" />,
  shield: <Shield className="w-4 h-4 mr-2" />,
  layers: <Layers className="w-4 h-4 mr-2" />,
  clock: <Clock className="w-4 h-4 mr-2" />,
  user: <User className="w-4 h-4 mr-2" />,
  settings: <Settings className="w-4 h-4 mr-2" />,
  keyround: <KeyRound className="w-4 h-4 mr-2" />,
  pluscircle: <PlusCircle className="w-4 h-4 mr-2" />,
  brain: <Brain className="w-4 h-4 mr-2" />,
  clipboardlist: <ClipboardList className="w-4 h-4 mr-2" />,
  barchart: <BarChart className="w-4 h-4 mr-2" />,
  messagesquare: <MessageSquare className="w-4 h-4 mr-2" />,
  uploadcloud: <UploadCloud className="w-4 h-4 mr-2" />,
  alertcircle: <AlertCircle className="w-4 h-4 mr-2 text-red-500" />,
  history: <History className="w-4 h-4 mr-2" />,
  filetext: <FileText className="w-4 h-4 mr-2" />,
  trendingup: <TrendingUp className="w-4 h-4 mr-2" />,
  clipboard: <Clipboard className="w-4 h-4 mr-2" />,
  piechart: <PieChart className="w-4 h-4 mr-2" />,
  server: <Server className="w-4 h-4 mr-2" />,
  sliders: <Sliders className="w-4 h-4 mr-2" />,
};

// Returns a React element based on icon key
const getIconComponent = (iconKey) =>
  iconMap[iconKey?.toLowerCase()] || <Layers className="w-4 h-4 mr-2" />;

export default function Sidebar() {
  const navigate = useNavigate();
  const [sidebarSections, setSidebarSections] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Theme detection
  useEffect(() => {
    const htmlElement = document.documentElement;
    const checkDarkMode = () => {
      setIsDarkMode(htmlElement.classList.contains('dark'));
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(htmlElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  // Fetch sidebar data from API
  useEffect(() => {
    const fetchSidebar = async () => {
      try {
        const data = await getSidebarData();
        const transformed = data.map((section) => ({
          ...section,
          items: section.items.map((item) => ({
            ...item,
            icon: getIconComponent(item.icon_key),
          })),
        }));
        setSidebarSections(transformed);
      } catch (error) {
        console.error('Error fetching sidebar:', error);
      }
    };
    fetchSidebar();
  }, []);

  // Logout
  const handleLogout = async () => {
    await logoutUser();
    navigate('/');
  };

  return (
    <aside className="w-64 bg-[#EAF0FF] dark:bg-[#23243a] text-gray-900 dark:text-gray-200 border-r border-[#DCEBFF] dark:border-gray-700 h-screen flex flex-col">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 border-b border-[#DCEBFF] dark:border-gray-700 px-4">
        <img
          src={isDarkMode ? darkLogo : lightLogo}
          alt="Petrokens Logo"
          className="h-12 object-contain"
        />
      </div>

      {/* Sidebar Sections */}
      <div className="flex-1 overflow-y-auto">
        {sidebarSections.map((section) => (
          <SidebarSection
            key={section.title}
            title={section.title}
            items={section.items}
          />
        ))}
      </div>

      {/* Logout */}
      <div className="border-t border-[#DCEBFF] dark:border-gray-400 px-1 py-1">
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2 rounded-md text-sm font-medium text-left text-red-600 hover:bg-[#FFECEC] dark:hover:bg-[#661111]"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </button>
      </div>
    </aside>
  );
}

function SidebarSection({ title, items }) {
  return (
    <div className="mt-6 px-4">
      <h2 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">
        {title}
      </h2>
      <nav className="space-y-1">
        {items.map((item) => renderNavLink(item))}
      </nav>
    </div>
  );
}

function renderNavLink(item) {
  return (
    <NavLink
      key={item.path}
      to={item.path}
      className={({ isActive }) =>
        `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
          isActive
            ? 'bg-[#DCEBFF] text-[#0B4D99] dark:bg-[#4E8CFB] dark:text-white'
            : 'hover:bg-[#F2F6FF] dark:hover:bg-[#2a2b4f]'
        }`
      }
    >
      {item.icon}
      {item.label}
    </NavLink>
  );
} 

import { Menu, X } from 'lucide-react';
import { useSidebarDrawer } from '@/context/SidebarDrawerContext';

export default function SidebarMenuButton() {
  const { toggle, open } = useSidebarDrawer();
  return (
    <button
      type="button"
      onClick={toggle}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#cfe2ff] bg-white text-[#0B4D99] dark:border-dash-border dark:bg-dash-surface-elevated dark:text-dash-text"
      aria-label={open ? 'Close navigation' : 'Open navigation'}
    >
      {open ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
    </button>
  );
}

import { useSidebarDrawer } from '@/context/SidebarDrawerContext';

export default function SidebarDrawer({ children, widthClass = 'w-64' }) {
  const { open } = useSidebarDrawer();
  return (
    <div className={`h-screen min-h-0 shrink-0 overflow-hidden transition-[width] duration-300 ${open ? widthClass : 'w-0'}`} aria-hidden={!open}>
      <div className={`flex h-full min-h-0 ${widthClass} shrink-0 flex-col`}>{children}</div>
    </div>
  );
}

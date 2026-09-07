import { useSidebarDrawer } from '@/context/SidebarDrawerContext';

export default function SidebarDrawer({ children, widthClass = 'w-64' }) {
  const { open } = useSidebarDrawer();
  return (
    <div className={`h-screen shrink-0 overflow-hidden transition-[width] duration-300 ${open ? widthClass : 'w-0'}`} aria-hidden={!open}>
      <div className={`h-full ${widthClass} shrink-0`}>{children}</div>
    </div>
  );
}

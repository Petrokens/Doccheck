import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebarDrawer } from '@/context/SidebarDrawerContext';

export default function SidebarMenuButton() {
  const { toggle, open } = useSidebarDrawer();
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggle}
      aria-label={open ? 'Close navigation' : 'Open navigation'}
    >
      {open ? <X /> : <Menu />}
    </Button>
  );
}

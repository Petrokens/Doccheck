import AppRoutes from './routes';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function App() {
  return (
    <TooltipProvider>
      <AppRoutes />
      <Toaster position="top-center" />
    </TooltipProvider>
  );
}

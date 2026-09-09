import AppRoutes from './routes';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import AppUpdateDialog from '@/components/Common/AppUpdateDialog';

export default function App() {
  return (
    <TooltipProvider>
      <AppRoutes />
      <AppUpdateDialog />
      <Toaster position="top-center" />
    </TooltipProvider>
  );
}

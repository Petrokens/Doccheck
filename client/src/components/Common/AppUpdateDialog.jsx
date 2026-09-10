import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { APP_VERSION } from '@/config';
import { fetchAppVersion } from '@/services/appVersionService';
import { isOutdated } from '@/lib/appVersion';
import { onAppRefresh } from '@/lib/appRefresh';

const DISMISS_KEY = 'doccheck-dismissed-app-version';
const CHECK_MS = 10 * 60 * 1000;

async function runningVersion() {
  try {
    if (window.doccheckDesktop?.appVersion) {
      const desktop = await window.doccheckDesktop.appVersion();
      if (desktop) return String(desktop);
    }
  } catch {
    // fall through
  }
  return APP_VERSION;
}

export default function AppUpdateDialog() {
  const [update, setUpdate] = useState(null);

  const check = useCallback(async () => {
    const skipBrowserDev = import.meta.env.DEV && !window.doccheckDesktop?.isDesktop;
    if (skipBrowserDev) return;
    try {
      const latest = await fetchAppVersion();
      const current = await runningVersion();
      if (!latest?.version || !isOutdated(current, latest.version)) {
        setUpdate(null);
        return;
      }
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (!latest.forceUpdate && dismissed === latest.version) {
        setUpdate(null);
        return;
      }
      setUpdate({ ...latest, current });
    } catch {
      // Health check is best-effort.
    }
  }, []);

  useEffect(() => {
    check();
    const timer = setInterval(check, CHECK_MS);
    const stop = onAppRefresh(check);
    return () => {
      clearInterval(timer);
      stop();
    };
  }, [check]);

  if (!update) return null;

  const dismiss = () => {
    if (!update.forceUpdate) localStorage.setItem(DISMISS_KEY, update.version);
    setUpdate(null);
  };

  const applyUpdate = (event) => {
    event?.preventDefault?.();
    if (update.downloadUrl) {
      window.open(update.downloadUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    toast.message(`Install DocCheck AI v${update.version}, then restart the app.`, {
      description: `This copy is still v${update.current}. A page refresh cannot install the new version.`,
    });
    if (!update.forceUpdate) dismiss();
  };

  return (
    <AlertDialog open onOpenChange={(open) => { if (!open && !update.forceUpdate) dismiss(); }}>
      <AlertDialogContent size="default" className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-primary/10 text-primary">
            <Download />
          </AlertDialogMedia>
          <AlertDialogTitle>Update available</AlertDialogTitle>
          <AlertDialogDescription>
            {update.message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Your version</p>
            <p className="font-semibold tabular-nums">v{update.current}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Latest version</p>
            <p className="font-semibold tabular-nums text-primary">v{update.version}</p>
          </div>
        </div>
        <AlertDialogFooter>
          {update.forceUpdate ? null : (
            <AlertDialogCancel onClick={dismiss}>Later</AlertDialogCancel>
          )}
          <Button type="button" onClick={applyUpdate}>
            <Download /> {update.downloadUrl ? 'Download update' : 'Got it'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

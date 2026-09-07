import { useEffect } from 'react';
import { applyDocumentTheme, getThemeMode } from '@/lib/theme';

export function useDashboardTheme() {
  useEffect(() => {
    applyDocumentTheme();
    if (getThemeMode() !== 'system') return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyDocumentTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
}

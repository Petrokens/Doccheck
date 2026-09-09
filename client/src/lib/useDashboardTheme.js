import { useEffect } from 'react';
import { applyDocumentTheme } from '@/lib/theme';

export function useDashboardTheme() {
  useEffect(() => {
    applyDocumentTheme();
  }, []);
}

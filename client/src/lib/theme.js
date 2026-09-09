export const THEME_STORAGE_KEY = 'theme';

export function getThemeMode() {
  return 'light';
}

export function resolveIsDark() {
  return false;
}

export function roleThemeFromUser(user) {
  return Number(user?.role_id) === 1 ? 'master' : 'user';
}

export function applyRoleTheme(roleTheme = 'user') {
  if (typeof document === 'undefined') return;
  const value = roleTheme === 'master' ? 'master' : 'user';
  document.documentElement.dataset.roleTheme = value;
}

export function clearRoleTheme() {
  if (typeof document === 'undefined') return;
  delete document.documentElement.dataset.roleTheme;
}

export function applyDocumentTheme() {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.remove('dark');
  try {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
  } catch {
    /* ignore */
  }
}

export function setThemeMode() {
  applyDocumentTheme();
  window.dispatchEvent(new CustomEvent('doccheck-theme-change', { detail: { mode: 'light' } }));
}

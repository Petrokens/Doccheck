export const THEME_STORAGE_KEY = 'theme';

export function getThemeMode() {
  if (typeof window === 'undefined') return 'light';
  const v = localStorage.getItem(THEME_STORAGE_KEY);
  if (v === 'light' || v === 'dark' || v === 'system') return v;
  return 'light';
}

export function resolveIsDark(mode = getThemeMode()) {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
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

export function applyDocumentTheme(mode = getThemeMode()) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', resolveIsDark(mode));
}

export function setThemeMode(mode) {
  localStorage.setItem(THEME_STORAGE_KEY, mode);
  applyDocumentTheme(mode);
  window.dispatchEvent(new CustomEvent('doccheck-theme-change', { detail: { mode } }));
}

export const APP_REFRESH_EVENT = 'doccheck-app-refresh';

export function requestAppRefresh() {
  window.dispatchEvent(new CustomEvent(APP_REFRESH_EVENT));
}

export function onAppRefresh(handler) {
  const listener = () => handler();
  window.addEventListener(APP_REFRESH_EVENT, listener);
  return () => window.removeEventListener(APP_REFRESH_EVENT, listener);
}

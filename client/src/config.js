const PRODUCTION_API_URL = 'https://petrolenz.onrender.com/api';
const LOCAL_API_URL = 'http://127.0.0.1:5000/api';

function resolveApiBaseUrl() {
  const fromEnv = String(import.meta.env.VITE_API_BASE_URL || '').trim();
  if (fromEnv) return fromEnv;
  const desktopApi = typeof window !== 'undefined'
    ? String(window.doccheckDesktop?.apiBaseUrl || '').trim()
    : '';
  if (desktopApi) return desktopApi;
  return import.meta.env.DEV ? LOCAL_API_URL : PRODUCTION_API_URL;
}

/** Prefer VITE_API_BASE_URL. Packaged desktop uses hosted API (or local if it is already up). */
export const API_BASE_URL = resolveApiBaseUrl();

/** Local PaddleOCR microservice (server/ocr-service). Override with VITE_PADDLEOCR_URL. */
export const PADDLEOCR_URL =
  String(import.meta.env.VITE_PADDLEOCR_URL || '').trim() || 'http://127.0.0.1:8866';

/** Baked into this build. Desktop uses Electron app version when available. */
export const APP_VERSION = String(import.meta.env.VITE_APP_VERSION || '1.0.0').trim() || '1.0.0';

const PRODUCTION_API_URL = 'https://petrolenz.onrender.com/api';
const LOCAL_API_URL = 'http://127.0.0.1:5000/api';

function resolveApiBaseUrl() {
  const fromEnv = String(import.meta.env.VITE_API_BASE_URL || '').trim();
  if (fromEnv) return fromEnv;
  // Desktop talks to the API on this PC. Hosted Render is currently offline.
  if (typeof window !== 'undefined' && window.doccheckDesktop?.isDesktop) {
    return LOCAL_API_URL;
  }
  return import.meta.env.DEV ? 'http://localhost:5000/api' : PRODUCTION_API_URL;
}

/** Prefer VITE_API_BASE_URL. Desktop → local API; browser DEV → local; PROD web → hosted. */
export const API_BASE_URL = resolveApiBaseUrl();

/** Local PaddleOCR microservice (server/ocr-service). Override with VITE_PADDLEOCR_URL. */
export const PADDLEOCR_URL =
  String(import.meta.env.VITE_PADDLEOCR_URL || '').trim() || 'http://127.0.0.1:8866';

/** Baked into this build. Desktop uses Electron app version when available. */
export const APP_VERSION = String(import.meta.env.VITE_APP_VERSION || '1.0.0').trim() || '1.0.0';

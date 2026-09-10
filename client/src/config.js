const PRODUCTION_API_URL = 'https://petrolenz.onrender.com/api';

function resolveApiBaseUrl() {
  const fromEnv = String(import.meta.env.VITE_API_BASE_URL || '').trim();
  if (fromEnv) return fromEnv;
  // Electron desktop always uses hosted API (even when Vite DEV is true).
  if (typeof window !== 'undefined' && window.doccheckDesktop?.isDesktop) {
    return PRODUCTION_API_URL;
  }
  return import.meta.env.DEV ? 'http://localhost:5000/api' : PRODUCTION_API_URL;
}

/** Prefer VITE_API_BASE_URL. Desktop → production; browser DEV → local; PROD build → hosted. */
export const API_BASE_URL = resolveApiBaseUrl();

/** Local PaddleOCR microservice (server/ocr-service). Override with VITE_PADDLEOCR_URL. */
export const PADDLEOCR_URL =
  String(import.meta.env.VITE_PADDLEOCR_URL || '').trim() || 'http://127.0.0.1:8866';

/** Baked into this build. Desktop uses Electron app version when available. */
export const APP_VERSION = String(import.meta.env.VITE_APP_VERSION || '1.0.0').trim() || '1.0.0';

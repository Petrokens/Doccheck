const HOSTED_API = 'https://doccheck-3qw4.onrender.com/api';

/**
 * API base URL.
 * Default is the live Render API. Override with VITE_API_URL or desktop injection.
 */
function resolveApiBaseUrl() {
  const desktopApi =
    typeof window !== 'undefined'
      ? String(window.doccheckDesktop?.apiBaseUrl || '').trim()
      : '';
  if (desktopApi) return desktopApi.replace(/\/$/, '');
  const envApi = String(import.meta.env.VITE_API_URL || '').trim();
  if (envApi) return envApi.replace(/\/$/, '');
  return HOSTED_API;
}

export const API_BASE_URL = resolveApiBaseUrl();

/** Local PaddleOCR microservice (server/ocr-service). Override with VITE_PADDLEOCR_URL. */
export const PADDLEOCR_URL =
  String(import.meta.env.VITE_PADDLEOCR_URL || '').trim() || 'http://127.0.0.1:8866';

/** Baked into this build. Desktop uses Electron app version when available. */
export const APP_VERSION = String(import.meta.env.VITE_APP_VERSION || '1.0.0').trim() || '1.0.0';

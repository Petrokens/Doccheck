/**
 * API base URL.
 * - Desktop EXE may inject window.doccheckDesktop.apiBaseUrl
 * - Vite/dev → local API (OTP + SMTP from server/.env)
 * - Production web/EXE build → live Render (must have OTP code + SMTP env deployed)
 */
function resolveApiBaseUrl() {
  const desktopApi =
    typeof window !== 'undefined'
      ? String(window.doccheckDesktop?.apiBaseUrl || '').trim()
      : '';
  if (desktopApi) return desktopApi;
  if (import.meta.env.DEV) return 'http://127.0.0.1:5000/api';
  return 'https://doccheck-3qw4.onrender.com/api';
}

export const API_BASE_URL = resolveApiBaseUrl();

/** Local PaddleOCR microservice (server/ocr-service). Override with VITE_PADDLEOCR_URL. */
export const PADDLEOCR_URL =
  String(import.meta.env.VITE_PADDLEOCR_URL || '').trim() || 'http://127.0.0.1:8866';

/** Baked into this build. Desktop uses Electron app version when available. */
export const APP_VERSION = String(import.meta.env.VITE_APP_VERSION || '1.0.0').trim() || '1.0.0';

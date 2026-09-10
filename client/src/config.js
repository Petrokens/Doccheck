/** Prefer VITE_API_BASE_URL. Dev defaults to local API; production to hosted DocCheck AI API. */
export const API_BASE_URL =
  String(import.meta.env.VITE_API_BASE_URL || '').trim() ||
  (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://petrolenz.onrender.com/api');

/** Local PaddleOCR microservice (server/ocr-service). Override with VITE_PADDLEOCR_URL. */
export const PADDLEOCR_URL =
  String(import.meta.env.VITE_PADDLEOCR_URL || '').trim() || 'http://127.0.0.1:8866';

/** Baked into this build. Desktop uses Electron app version when available. */
export const APP_VERSION = String(import.meta.env.VITE_APP_VERSION || '1.0.0').trim() || '1.0.0';

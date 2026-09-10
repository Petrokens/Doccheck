/** Hosted DocCheck AI API (override with VITE_API_BASE_URL). */
export const API_BASE_URL =
  String(import.meta.env.VITE_API_BASE_URL || '').trim() ||
  'https://petrolenz.onrender.com/api';

/** Baked into this build. Desktop uses Electron app version when available. */
export const APP_VERSION = String(import.meta.env.VITE_APP_VERSION || '1.0.0').trim() || '1.0.0';

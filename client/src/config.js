/** Always use the hosted Render API — no local server required. */
export const API_BASE_URL =
  String(import.meta.env.VITE_API_BASE_URL || '').trim() ||
  'https://petrolenz.onrender.com/api';

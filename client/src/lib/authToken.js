import { jwtDecode } from 'jwt-decode';
import { refreshAccessToken } from '../services/authService';
import { getAccessToken, setAccessToken } from './axios';

export function isAccessTokenValid(token) {
  if (!token || typeof token !== 'string') return false;
  try {
    const { exp } = jwtDecode(token);
    if (!exp) return false;
    return exp * 1000 > Date.now() + 5000;
  } catch {
    return false;
  }
}

export async function getValidAccessToken() {
  const current = getAccessToken();
  if (isAccessTokenValid(current)) return current;
  const fresh = await refreshAccessToken();
  setAccessToken(fresh);
  return fresh;
}

export function bearerAuthHeaders(token) {
  const headers = { 'X-Requested-With': 'DocCheck' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

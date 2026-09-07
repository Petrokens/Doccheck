import { jwtDecode } from 'jwt-decode';
import { refreshAccessToken } from '../services/authService';
import { setAccessToken } from './axios';

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
  const stored = localStorage.getItem('accessToken');
  if (isAccessTokenValid(stored)) {
    setAccessToken(stored);
    return stored;
  }
  const fresh = await refreshAccessToken();
  setAccessToken(fresh);
  return fresh;
}

export function bearerAuthHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

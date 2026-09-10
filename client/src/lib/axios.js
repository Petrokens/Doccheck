import axios from 'axios';
import { API_BASE_URL } from '../config';
import { refreshAccessToken } from '../services/authService';

let accessToken = null;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  // Render free tier can cold-start for 60s+
  timeout: import.meta.env.PROD ? 90000 : 20000,
});

api.interceptors.request.use((config) => {
  config.headers['X-Requested-With'] = 'DocCheck';
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const url = originalRequest?.url || '';
    const isAuthPublic =
      url.includes('/auth/login') ||
      url.includes('/auth/refresh');
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthPublic) {
      originalRequest._retry = true;
      try {
        accessToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        originalRequest.headers['X-Requested-With'] = 'DocCheck';
        return api(originalRequest);
      } catch {
        accessToken = null;
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export const setAccessToken = (token) => {
  accessToken = token || null;
};

export const getAccessToken = () => accessToken;

export const clearAccessToken = () => {
  accessToken = null;
};

export default api;

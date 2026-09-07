import axios from 'axios';
import { API_BASE_URL } from '../config';
import { refreshAccessToken } from '../services/authService';

let accessToken = null;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = accessToken || localStorage.getItem('accessToken');
  if (token) {
    accessToken = token;
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const url = originalRequest?.url || '';
    const isAuthPublic = url.includes('/auth/login') || url.includes('/auth/refresh');
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthPublic) {
      originalRequest._retry = true;
      try {
        accessToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        accessToken = null;
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export const setAccessToken = (token) => {
  accessToken = token;
};

export const clearAccessToken = () => {
  accessToken = null;
};

export default api;

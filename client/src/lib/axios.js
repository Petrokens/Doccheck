import axios from 'axios';
import { API_BASE_URL } from '../config';
import { refreshAccessToken } from '../services/authService';

let accessToken = null;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Ensures cookies (refresh token) are sent
});

// ============================
// Request Interceptor
// ============================
api.interceptors.request.use(
  (config) => {
    const token = accessToken || localStorage.getItem('accessToken');
    if (token) {
      accessToken = token;
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================
// Response Interceptor
// ============================
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry // Prevent infinite retry loop
    ) {
      originalRequest._retry = true;
      try {
        // Refresh the access token
        accessToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest); // Retry the original request
      } catch (refreshError) {
        console.error('Session expired. Redirecting to login...');
        window.location.href = '/login'; // Optional: redirect on failure
      }
    }

    return Promise.reject(error);
  }
);

export const setAccessToken = (token) => {
  accessToken = token;
};

export const clearAccessToken = ()=>{
  accessToken = null;
}

export default api;
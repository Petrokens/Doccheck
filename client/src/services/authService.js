import api, { clearAccessToken, setAccessToken } from '../lib/axios';

export const loginUser = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  localStorage.setItem('accessToken', response.data.accessToken);
  setAccessToken(response.data.accessToken);
  return response.data;
};

export const sendForgotPasswordEmail = async (email) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (token, password) => {
  const response = await api.post('/auth/reset-password', { token, password });
  return response.data;
};

export const logoutUser = async () => {
  try {
    await api.post('/auth/logout', {});
  } finally {
    localStorage.removeItem('accessToken');
    clearAccessToken();
  }
};

export const refreshAccessToken = async () => {
  const response = await api.post('/auth/refresh', {});
  localStorage.setItem('accessToken', response.data.accessToken);
  setAccessToken(response.data.accessToken);
  return response.data.accessToken;
};

export const getUserProfile = async () => {
  const response = await api.get('/auth/me');
  return response.data.user;
};

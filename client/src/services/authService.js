import api, { clearAccessToken, setAccessToken } from '../lib/axios';

export const loginUser = async (credentials) => {
  const response = await api.post('/auth/login', {
    email: String(credentials.email || '').trim(),
    password: credentials.password,
  });
  if (response.data.accessToken) setAccessToken(response.data.accessToken);
  return response.data;
};

export const verifyLoginOtp = async ({ challengeId, otp }) => {
  const response = await api.post('/auth/login/verify-otp', {
    challengeId,
    otp: String(otp || '').trim(),
  });
  setAccessToken(response.data.accessToken);
  return response.data;
};

export const resendLoginOtp = async ({ challengeId }) => {
  const response = await api.post('/auth/login/resend-otp', { challengeId });
  return response.data;
};

export const sendForgotPasswordEmail = async (email) => {
  const response = await api.post('/auth/forgot-password', { email: String(email || '').trim() });
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
    clearAccessToken();
  }
};

export const refreshAccessToken = async () => {
  const response = await api.post('/auth/refresh', {});
  setAccessToken(response.data.accessToken);
  return response.data.accessToken;
};

export const getUserProfile = async () => {
  const response = await api.get('/auth/me');
  return response.data.user;
};

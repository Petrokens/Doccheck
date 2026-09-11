import api, { clearAccessToken, setAccessToken } from '../lib/axios';

export const loginUser = async (credentials) => {
  const response = await api.post('/auth/login', {
    email: String(credentials.email || '').trim(),
    password: credentials.password,
  });
  return response.data;
};

export const verifyLoginOtp = async ({ challengeId, otp }) => {
  const response = await api.post('/auth/verify-otp', {
    challengeId,
    otp: String(otp || '').replace(/[^\d]/g, '').slice(0, 6),
  });
  if (response.data.accessToken) setAccessToken(response.data.accessToken);
  return response.data;
};

export const resendLoginOtp = async ({ challengeId }) => {
  const response = await api.post('/auth/resend-otp', { challengeId });
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

import api, { clearAccessToken, setAccessToken } from '../lib/axios';

// ----------------------
// User Login
// ----------------------
export const loginUser = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  localStorage.setItem('accessToken', response.data.accessToken);
  setAccessToken(response.data.accessToken);
  return response.data;
};

// ----------------------
// Create User by Admin
// ----------------------
export const createUserByAdmin = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

// ----------------------
// Forgot Password
// ----------------------
export const sendForgotPasswordEmail = async (email) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

// ----------------------
// Reset Password
// ----------------------
export const resetPassword = async (token, password) => {
  const response = await api.post('/auth/reset-password', { token, password });
  return response.data;
};

// ----------------------
// Register (Self-signup or Admin)
// ----------------------
export const registerUser = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

// ----------------------
// Logout
// ----------------------
export const logoutUser = async () => {
  try {
    await api.post('/auth/logout');
  } catch {
    // Still sign out locally if the API is unreachable or the session is already invalid
  } finally {
    localStorage.removeItem('accessToken');
    clearAccessToken();
  }
};

// ----------------------


// Refresh Access Token
// ----------------------
export const refreshAccessToken = async () => {
  const response = await api.post('/auth/refresh');
  const newAccessToken = response.data.accessToken;
  localStorage.setItem('accessToken', newAccessToken);
  return newAccessToken;
};

// ----------------------
// Get User Profile by ID
// ----------------------
export const getUserProfile = async (user_id) => {
  try {
    const response = await api.get(`/users/${user_id}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    throw error;
  }
};

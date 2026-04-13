// src/services/roleService.js
import api from '../lib/axios';

// ----------------------
// Get All Roles
// ----------------------
export const getRoles = async () => {
  try {
    const response = await api.get('/roles');
    return response.data; // array of roles
  } catch (error) {
    console.error('Failed to fetch roles:', error);
    throw error;
  }
};

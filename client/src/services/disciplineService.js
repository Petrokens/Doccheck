import api from '../lib/axios';

// ----------------------
// Create Discipline
// ----------------------
export const createDiscipline = async (name) => {
  const response = await api.post('/disciplines', { name });
  return response.data;
};

// ----------------------
// Get All Disciplines
// ----------------------
export const getAllDisciplines = async () => {
  const response = await api.get('/disciplines');
  return response.data;
};

// ----------------------
// Get Discipline by ID
// ----------------------
export const getDisciplineById = async (id) => {
  const response = await api.get(`/disciplines/${id}`);
  return response.data;
};

// ----------------------
// Update Discipline
// ----------------------
export const updateDiscipline = async (id, name) => {
  const response = await api.put(`/disciplines/${id}`, { name });
  return response.data;
};

// ----------------------
// Delete Discipline
// ----------------------
export const deleteDiscipline = async (id) => {
  const response = await api.delete(`/disciplines/${id}`);
  return response.data;
};

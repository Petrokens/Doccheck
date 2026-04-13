import api from '../lib/axios';

// Fetch dynamic sidebar data (disciplines + other sections)
export const getSidebarData = async () => {
  try {
    const response = await api.get('/sidebar');
    return response.data; // expected: { disciplines: [], utilities: [], aiTools: [], ... }
  } catch (error) {
    console.error('Failed to fetch sidebar data:', error);
    throw error.response?.data || { error: 'Unknown error occurred' };
  }
};



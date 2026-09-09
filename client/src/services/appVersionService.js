import api from '@/lib/axios';

export async function fetchAppVersion() {
  const response = await api.get('/health');
  return response.data;
}

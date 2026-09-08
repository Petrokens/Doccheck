import api from '../lib/axios';

export async function listAnnouncements() {
  const { data } = await api.get('/announcements');
  return data;
}

export async function createAnnouncement({ title, body, role_ids }) {
  const { data } = await api.post('/announcements', { title, body, role_ids }, { timeout: 120000 });
  return data;
}

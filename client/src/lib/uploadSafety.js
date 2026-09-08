export const ALLOWED_UPLOAD_EXT = ['.pdf', '.docx', '.txt', '.csv', '.md', '.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff'];
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export function validateUploadFile(file) {
  if (!file) return { ok: false, reason: 'No file selected.' };
  const name = String(file.name || '').toLowerCase();
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
  if (!ALLOWED_UPLOAD_EXT.includes(ext)) {
    return { ok: false, reason: 'File type is not allowed.' };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, reason: 'File exceeds the 25 MB limit.' };
  }
  return { ok: true };
}

export function publicApiError(err, fallback = 'Request failed') {
  if (err?.response?.data?.error) return err.response.data.error;
  if (err?.code === 'ECONNABORTED' || String(err?.message || '').toLowerCase().includes('timeout')) {
    return 'Server is not responding. The API may be waking up or offline — try again in a minute.';
  }
  if (!err?.response && (err?.code === 'ERR_NETWORK' || err?.message === 'Network Error')) {
    return 'Cannot reach API (https://petrolenz.onrender.com). Check internet or Render service status.';
  }
  return fallback;
}

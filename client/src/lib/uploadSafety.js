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
  return err?.response?.data?.error || fallback;
}

const path = require('path');

const MAX_FILE_BYTES = 100 * 1024 * 1024;
const ALLOWED_EXT = new Set(['.pdf', '.docx', '.txt', '.csv', '.md', '.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff']);

const MAGIC = [
  { ext: ['.pdf'], test: (b) => b.slice(0, 5).toString('ascii') === '%PDF-' },
  { ext: ['.png'], test: (b) => b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { ext: ['.jpg', '.jpeg'], test: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: ['.webp'], test: (b) => b.slice(0, 4).toString('ascii') === 'RIFF' && b.slice(8, 12).toString('ascii') === 'WEBP' },
  { ext: ['.tif', '.tiff'], test: (b) => (b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0x00) || (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0x00 && b[3] === 0x2a) },
  { ext: ['.docx'], test: (b) => b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07) },
  { ext: ['.txt', '.csv', '.md'], test: (b) => !b.slice(0, 512).includes(0x00) },
];

function sanitizeFileName(name) {
  const base = path.basename(String(name || 'upload')).replace(/[\u0000-\u001f]/g, '');
  const cleaned = base.replace(/[^\w.\- ()[\]]+/g, '_').slice(0, 180);
  return cleaned || 'upload';
}

function isAllowedUpload(file) {
  const ext = path.extname(file?.originalname || '').toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return { ok: false, reason: 'File type is not allowed.' };
  const buf = file.buffer;
  if (!Buffer.isBuffer(buf) || !buf.length) return { ok: false, reason: 'Empty file.' };
  if (buf.length > MAX_FILE_BYTES) return { ok: false, reason: 'File exceeds the 100 MB limit.' };
  const match = MAGIC.find((rule) => rule.ext.includes(ext));
  if (match && !match.test(buf)) return { ok: false, reason: 'File contents do not match the declared type.' };
  return { ok: true };
}

function assertUploadedFiles(req) {
  const groups = Object.values(req.files || {}).flat();
  for (const file of groups) {
    const check = isAllowedUpload(file);
    if (!check.ok) {
      const err = new Error(check.reason);
      err.status = 400;
      throw err;
    }
    file.originalname = sanitizeFileName(file.originalname);
  }
}

module.exports = {
  MAX_FILE_BYTES,
  ALLOWED_EXT,
  sanitizeFileName,
  isAllowedUpload,
  assertUploadedFiles,
};

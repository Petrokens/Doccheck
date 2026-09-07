const multer = require('multer');
const path = require('path');

const BLOCKED = new Set(['.exe', '.msi', '.bat', '.cmd', '.com', '.scr', '.ps1', '.vbs', '.jar', '.dll', '.reg']);

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (BLOCKED.has(ext)) return cb(new Error('Executable files are not allowed.'), false);
    cb(null, true);
  },
  limits: { fileSize: 80 * 1024 * 1024 },
});

module.exports = upload;

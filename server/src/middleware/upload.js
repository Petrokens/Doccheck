const multer = require('multer');
const path = require('path');
const { ALLOWED_EXT, MAX_FILE_BYTES } = require('../security/uploadPolicy');

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_EXT.has(ext)) return cb(new Error('File type is not allowed.'), false);
    cb(null, true);
  },
  limits: {
    fileSize: MAX_FILE_BYTES,
    files: 8,
    fields: 20,
  },
});

module.exports = upload;

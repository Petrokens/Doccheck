const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (allowedTypes.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only PDF or DOCX files are allowed'), false);
};

const upload = multer({ storage, fileFilter });

module.exports = upload;

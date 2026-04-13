const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const checklistController = require('../controllers/checklistController');

// Set up multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${file.fieldname}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // max 5MB
  fileFilter: function (req, file, cb) {
    const filetypes = /pdf|doc|docx/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      return cb(null, true);
    }
    cb(new Error('Only .pdf, .doc, .docx files are allowed'));
  }
});

// Routes
router.post('/upload', upload.single('file'), checklistController.uploadChecklist);
router.get('/', checklistController.getAllChecklists);
router.get('/:id', checklistController.getChecklistById);
router.delete('/:id', checklistController.deleteChecklist);

module.exports = router;

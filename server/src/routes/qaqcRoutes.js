const express = require('express');
const multer = require('multer');
const qaqcController = require('../controllers/qaqcController');
const upload = require('../middleware/upload');
const verifyToken = require('../middleware/verifyToken');

function handleProcessReportUpload(err, req, res, next) {
  if (!err) return next();
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'A file exceeds the 80 MB limit.' });
    }
    return res.status(400).json({ error: err.message || 'File upload failed.' });
  }
  return res.status(400).json({ error: err.message || 'File upload failed.' });
}

const uploadFields = upload.fields([
  { name: 'mainDocument', maxCount: 15 },
  { name: 'supportDocument', maxCount: 35 },
]);

const router = express.Router();

router.post(
  '/process-report',
  verifyToken,
  uploadFields,
  handleProcessReportUpload,
  qaqcController.generateProcessReport,
);
router.post(
  '/process-report/stream',
  verifyToken,
  uploadFields,
  handleProcessReportUpload,
  qaqcController.generateProcessReportStream,
);
router.get('/reports', verifyToken, qaqcController.getProcessReportHistory);
router.get('/reports/:id', verifyToken, qaqcController.getProcessReportById);
router.patch('/reports/:id', verifyToken, qaqcController.updateProcessReport);
router.delete('/reports/:id', verifyToken, qaqcController.deleteProcessReport);
router.get('/reports/:id/download', qaqcController.downloadProcessReport);
router.get('/dashboard-stats', verifyToken, qaqcController.getReportDashboardStats);

module.exports = router;

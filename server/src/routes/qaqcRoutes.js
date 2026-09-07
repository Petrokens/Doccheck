const express = require('express');
const multer = require('multer');
const qaqcController = require('../controllers/qaqcController');
const upload = require('../middleware/upload');
const verifyToken = require('../middleware/verifyToken');
const requireTrustedOrigin = require('../middleware/requireTrustedOrigin');
const validateUploadedFiles = require('../middleware/validateUploadedFiles');
const { generateLimiter } = require('../middleware/rateLimits');

function handleProcessReportUpload(err, req, res, next) {
  if (!err) return next();
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'A file exceeds the 25 MB limit.' });
    }
    return res.status(400).json({ error: 'File upload failed.' });
  }
  return res.status(400).json({ error: err.message || 'File upload failed.' });
}

const uploadFields = upload.fields([
  { name: 'mainDocument', maxCount: 3 },
  { name: 'supportDocument', maxCount: 5 },
]);

const router = express.Router();
router.use(verifyToken);

router.post(
  '/process-report',
  generateLimiter,
  requireTrustedOrigin,
  uploadFields,
  handleProcessReportUpload,
  validateUploadedFiles,
  qaqcController.generateProcessReport,
);
router.post(
  '/process-report/stream',
  generateLimiter,
  requireTrustedOrigin,
  uploadFields,
  handleProcessReportUpload,
  validateUploadedFiles,
  qaqcController.generateProcessReportStream,
);
router.get('/reports', qaqcController.getProcessReportHistory);
router.get('/reports/:id', qaqcController.getProcessReportById);
router.patch('/reports/:id', requireTrustedOrigin, qaqcController.updateProcessReport);
router.delete('/reports/:id', requireTrustedOrigin, qaqcController.deleteProcessReport);
router.get('/reports/:id/download', qaqcController.downloadProcessReport);
router.get('/dashboard-stats', qaqcController.getReportDashboardStats);

module.exports = router;

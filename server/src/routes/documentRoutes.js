const express = require('express');
const router = express.Router();
const { uploadMiddleware, handleUpload } = require('../controllers/documentController');
const verifyToken = require('../middleware/verifyToken');

router.post('/upload',verifyToken, uploadMiddleware, handleUpload);

module.exports = router;

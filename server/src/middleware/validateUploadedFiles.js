const { assertUploadedFiles } = require('../security/uploadPolicy');

function validateUploadedFiles(req, res, next) {
  try {
    assertUploadedFiles(req);
    return next();
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message || 'File upload rejected.' });
  }
}

module.exports = validateUploadedFiles;

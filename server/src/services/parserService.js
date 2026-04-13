const textract = require('textract');
const path = require('path');
const fs = require('fs');

exports.uploadChecklist = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', file.filename);
    console.log('Uploading from:', filePath);

    // Ensure the file actually exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Uploaded file not found on server.' });
    }

    textract.fromFileWithPath(filePath, async (error, text) => {
      if (error) {
        console.error('Text extraction failed:', error);
        return res.status(500).json({
          error: 'Failed to extract text from document',
          details: error.message
        });
      }

      // Success
      res.status(200).json({
        message: 'Text extracted successfully',
        extractedText: text
      });
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).json({
      error: 'Unexpected server error',
      details: err.message
    });
  }
};


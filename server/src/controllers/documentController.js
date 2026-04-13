const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { exec } = require('child_process'); 
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

exports.uploadMiddleware = upload.single('file');

exports.handleUpload = async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const ext = path.extname(file.originalname).toLowerCase();

  try {
    let content = '';

    if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(file.path);
      const pdfData = await pdfParse(dataBuffer);
      content = pdfData.text;
    } else if (ext === '.docx') {
      const textract = require('textract');
      textract.fromFileWithPath(file.path, function (error, text) {
        if (error) return res.status(500).json({ error: 'Failed to parse DOCX', details: error.message });
        return res.json({ message: 'File parsed successfully', text });
      });
      return;
    } else {
      content = '[File uploaded successfully, but parsing is not supported for this file type yet]';
    }

    res.json({
      message: 'File uploaded and processed',
      filename: file.originalname,
      mimetype: file.mimetype,
      text: content
    });

  } catch (err) {
    res.status(500).json({ error: 'Error processing file', details: err.message });
  }
};






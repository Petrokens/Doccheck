const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const { createWorker } = require('tesseract.js');

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff', '.bmp']);

async function extractPdfText(buffer) {
  try {
    const result = await pdfParse(buffer);
    return String(result.text || '').trim();
  } catch {
    return '';
  }
}

async function extractDocx(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return String(result.value || '').trim();
  } catch {
    return '';
  }
}

function extractSpreadsheet(buffer) {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    return workbook.SheetNames.map((name) => {
      const sheet = workbook.Sheets[name];
      return `--- Sheet: ${name} ---\n${XLSX.utils.sheet_to_csv(sheet)}`;
    }).join('\n\n');
  } catch {
    return '';
  }
}

async function ocrImage(buffer) {
  const worker = await createWorker('eng');
  try {
    const { data } = await worker.recognize(buffer);
    return String(data?.text || '').trim();
  } finally {
    await worker.terminate();
  }
}

async function extractTextFromFile(file, onProgress) {
  const emit = typeof onProgress === 'function' ? onProgress : () => {};
  const name = file.originalname || 'document';
  const ext = path.extname(name).toLowerCase();
  const buffer = file.buffer;
  if (!buffer?.length) return '';

  if (ext === '.txt' || ext === '.md' || ext === '.csv') {
    emit(`Reading text file ${name}`);
    return buffer.toString('utf8');
  }
  if (ext === '.docx' || ext === '.doc') {
    emit(`Extracting Word document ${name}`);
    return extractDocx(buffer);
  }
  if (ext === '.xlsx' || ext === '.xls') {
    emit(`Extracting spreadsheet ${name}`);
    return extractSpreadsheet(buffer);
  }
  if (IMAGE_EXT.has(ext)) {
    emit(`OCR image ${name}`);
    return ocrImage(buffer);
  }
  if (ext === '.pdf') {
    emit(`Extracting PDF text ${name}`);
    const native = await extractPdfText(buffer);
    if (native.length >= 80) return native;
    emit(`PDF has little native text — OCR may be limited without page rasterization`);
    return native;
  }
  emit(`Reading ${name} as UTF-8`);
  return buffer.toString('utf8');
}

module.exports = { extractTextFromFile };

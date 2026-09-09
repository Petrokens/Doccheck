const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const { extractPdfAdvanced, extractImageAdvanced } = require('./advancedOcrService');

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff', '.bmp']);

async function extractPdfNativeFallback(buffer, onProgress) {
  const emit = typeof onProgress === 'function' ? onProgress : () => {};
  try {
    let pageCount = 0;
    const result = await pdfParse(buffer, {
      pagerender: async (pageData) => {
        pageCount += 1;
        const textContent = await pageData.getTextContent({
          normalizeWhitespace: true,
          disableCombineTextItems: false,
        });
        let lastY;
        let text = '';
        for (const item of textContent.items || []) {
          if (lastY === item.transform[5] || lastY === undefined) text += item.str;
          else text += `\n${item.str}`;
          lastY = item.transform[5];
        }
        const preview = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 90);
        emit(
          preview
            ? `OCR page ${pageCount}: ${preview}${text.length > 90 ? '…' : ''}`
            : `OCR page ${pageCount}: (image / low-text page)`,
        );
        return text;
      },
    });
    const numpages = result.numpages || pageCount || 0;
    if (numpages) emit(`PDF page scan complete (${numpages} page${numpages === 1 ? '' : 's'})`);
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
    try {
      return await extractImageAdvanced(buffer, name, emit);
    } catch (error) {
      emit(`Advanced image OCR failed (${error?.message || error}).`);
      return '';
    }
  }
  if (ext === '.pdf') {
    emit(`Starting advanced OCR + image analysis for PDF ${name}`);
    try {
      const advanced = await extractPdfAdvanced(buffer, emit);
      if (String(advanced || '').trim().length >= 40) return advanced;
      emit('Advanced OCR returned little text — trying native PDF parser fallback…');
    } catch (error) {
      emit(`Advanced OCR pipeline error (${error?.message || error}). Falling back to native PDF text…`);
    }
    return extractPdfNativeFallback(buffer, emit);
  }
  emit(`Reading ${name} as UTF-8`);
  return buffer.toString('utf8');
}

module.exports = { extractTextFromFile };

const sharp = require('sharp');
const { createWorker } = require('tesseract.js');
const { getOpenAIClient, getOpenAIModel } = require('../config/openai');

const DEFAULT_SCALE = Number(process.env.OCR_RENDER_SCALE || 2.2);
const OCR_MAX_PAGES = Math.max(1, Number(process.env.OCR_MAX_PAGES || 60) || 60);
const NATIVE_WEAK_CHARS = Math.max(20, Number(process.env.OCR_WEAK_PAGE_CHARS || 120) || 120);
const VISION_WEAK_CHARS = Math.max(10, Number(process.env.VISION_WEAK_PAGE_CHARS || 80) || 80);
const OCR_CONCURRENCY = Math.max(1, Math.min(4, Number(process.env.OCR_CONCURRENCY || 2) || 2));

function envFlag(name, fallback = false) {
  const raw = String(process.env[name] ?? '').trim().toLowerCase();
  if (!raw) return fallback;
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

function getOcrMode() {
  const mode = String(process.env.OCR_MODE || 'hybrid').trim().toLowerCase();
  if (mode === 'full' || mode === 'native' || mode === 'hybrid') return mode;
  return 'hybrid';
}

function visionEnabled() {
  return envFlag('ENABLE_VISION_ANALYSIS', true) && Boolean(getOpenAIClient());
}

function normalizeWhitespace(text) {
  return String(text || '')
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function previewText(text, max = 90) {
  const clean = normalizeWhitespace(text).replace(/\s+/g, ' ');
  if (!clean) return '';
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

function tokenSet(text) {
  return new Set(
    String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2),
  );
}

function overlapRatio(a, b) {
  const sa = tokenSet(a);
  const sb = tokenSet(b);
  if (!sa.size || !sb.size) return 0;
  let hit = 0;
  for (const t of sb) if (sa.has(t)) hit += 1;
  return hit / sb.size;
}

async function loadMuPdf() {
  return import('mupdf');
}

async function preprocessForOcr(imageBuffer) {
  return sharp(imageBuffer)
    .rotate()
    .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
    .grayscale()
    .normalize()
    .sharpen({ sigma: 1.1 })
    .png()
    .toBuffer();
}

async function createOcrWorker(onProgress) {
  const emit = typeof onProgress === 'function' ? onProgress : () => {};
  const worker = await createWorker('eng', 1);
  await worker.setParameters({
    tessedit_pageseg_mode: '3',
    preserve_interword_spaces: '1',
    user_defined_dpi: '300',
  });
  emit('Advanced OCR engine ready (Tesseract LSTM + Sharp enhance + MuPDF raster).');
  return worker;
}

async function ocrImageBuffer(worker, imageBuffer, onProgress, label = 'image') {
  const emit = typeof onProgress === 'function' ? onProgress : () => {};
  const enhanced = await preprocessForOcr(imageBuffer);
  emit(`OCR recognizing ${label}…`);
  const { data } = await worker.recognize(enhanced);
  return normalizeWhitespace(data?.text || '');
}

async function analyzeImageWithVision(imageBuffer, { pageLabel = 'page', mime = 'image/png' } = {}, onProgress) {
  const emit = typeof onProgress === 'function' ? onProgress : () => {};
  const client = getOpenAIClient();
  if (!client || !visionEnabled()) return '';

  const model = String(process.env.OPENAI_VISION_MODEL || getOpenAIModel() || 'gpt-4o-mini').trim();
  let prepared = imageBuffer;
  let imageMime = mime;
  try {
    prepared = await sharp(imageBuffer)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 78 })
      .toBuffer();
    imageMime = 'image/jpeg';
  } catch {
    prepared = imageBuffer;
  }
  const b64 = Buffer.from(prepared).toString('base64');
  emit(`Vision image analysis on ${pageLabel} (${model})…`);

  try {
    const response = await client.chat.completions.create({
      model,
      temperature: 0.1,
      max_tokens: 1400,
      messages: [
        {
          role: 'system',
          content:
            'You are an engineering document vision analyst for EPC QA/QC. Extract ALL readable text (title blocks, notes, tables, tags, dimensions, revisions) and briefly describe drawings/diagrams so no technical content is missed. Output plain text only.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this engineering document ${pageLabel}. Transcribe visible text completely and describe any P&ID/drawing/schematic content with equipment tags, line numbers, and notes.`,
            },
            {
              type: 'image_url',
              image_url: { url: `data:${imageMime};base64,${b64}`, detail: 'high' },
            },
          ],
        },
      ],
    });
    return normalizeWhitespace(response?.choices?.[0]?.message?.content || '');
  } catch (error) {
    emit(`Vision analysis skipped on ${pageLabel}: ${error?.message || error}`);
    return '';
  }
}

async function mapPool(items, concurrency, mapper) {
  const list = Array.isArray(items) ? items : [];
  const out = new Array(list.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, list.length) || 1 }, async () => {
    while (cursor < list.length) {
      const index = cursor;
      cursor += 1;
      out[index] = await mapper(list[index], index);
    }
  });
  await Promise.all(workers);
  return out;
}

function createAsyncQueue() {
  let chain = Promise.resolve();
  return (fn) => {
    const run = chain.then(fn, fn);
    chain = run.then(() => undefined, () => undefined);
    return run;
  };
}

function mergePageLayers({ pageNum, nativeText, ocrText, visionText }) {
  const native = normalizeWhitespace(nativeText);
  const ocr = normalizeWhitespace(ocrText);
  const vision = normalizeWhitespace(visionText);
  const parts = [`===== PAGE ${pageNum} =====`];

  if (native) parts.push(`--- Embedded text ---\n${native}`);

  if (ocr) {
    const dup = overlapRatio(native, ocr) >= 0.82;
    if (!native || !dup) parts.push(`--- OCR text ---\n${ocr}`);
    else if (ocr.length > native.length * 1.15) parts.push(`--- OCR supplemental ---\n${ocr}`);
  }

  if (vision) parts.push(`--- Image / drawing analysis ---\n${vision}`);
  if (parts.length === 1) parts.push('(No readable text detected on this page)');
  return parts.join('\n\n');
}

function extractNativeFromMuPage(page) {
  try {
    return normalizeWhitespace(page.toStructuredText('preserve-spans').asText());
  } catch {
    try {
      return normalizeWhitespace(page.toStructuredText().asText());
    } catch {
      return '';
    }
  }
}

function renderMuPagePng(mupdf, page, scale = DEFAULT_SCALE) {
  let fitted = scale;
  try {
    const bounds = page.getBounds();
    const width = Math.abs(bounds[2] - bounds[0]) || 1;
    const height = Math.abs(bounds[3] - bounds[1]) || 1;
    const maxEdge = Math.max(1, Number(process.env.OCR_MAX_RASTER_EDGE || 2200) || 2200);
    fitted = Math.min(scale, maxEdge / Math.max(width, height));
  } catch {
    fitted = Math.min(scale, 1.2);
  }
  const matrix = mupdf.Matrix.scale(fitted, fitted);
  const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false, true);
  const png = Buffer.from(pixmap.asPNG());
  try {
    pixmap.destroy?.();
  } catch {
    // ignore
  }
  return png;
}

async function extractPdfAdvanced(buffer, onProgress) {
  const emit = typeof onProgress === 'function' ? onProgress : () => {};
  const mode = getOcrMode();
  const mupdf = await loadMuPdf();
  const pdf = mupdf.Document.openDocument(buffer, 'application/pdf');
  const totalPages = pdf.countPages() || 0;
  const limit = Math.min(totalPages, OCR_MAX_PAGES);
  emit(`Advanced PDF pipeline: ${totalPages} page(s), processing ${limit}, mode=${mode}.`);

  if (totalPages > OCR_MAX_PAGES) {
    emit(`Note: OCR_MAX_PAGES=${OCR_MAX_PAGES}; remaining pages skipped for runtime safety.`);
  }

  let worker = null;
  if (mode !== 'native') {
    worker = await createOcrWorker(emit);
  }
  const ocrQueue = createAsyncQueue();

  try {
    const pageNumbers = Array.from({ length: limit }, (_, i) => i);
    const pageResults = await mapPool(pageNumbers, OCR_CONCURRENCY, async (pageIndex) => {
      const pageNum = pageIndex + 1;
      const page = pdf.loadPage(pageIndex);
      const nativeText = extractNativeFromMuPage(page);
      const weakNative = nativeText.length < NATIVE_WEAK_CHARS;
      const shouldOcr = mode === 'full' || (mode === 'hybrid' && weakNative);
      let ocrText = '';
      let visionText = '';
      let png = null;

      if (shouldOcr || (visionEnabled() && weakNative)) {
        png = renderMuPagePng(mupdf, page);
      }

      if (shouldOcr && png && worker) {
        emit(`Raster OCR page ${pageNum}/${limit}${weakNative ? ' (low embedded text)' : ''}…`);
        ocrText = await ocrQueue(() => ocrImageBuffer(worker, png, emit, `page ${pageNum}/${limit}`));
        emit(
          ocrText
            ? `OCR page ${pageNum}/${limit}: ${previewText(ocrText, 320)}`
            : `OCR page ${pageNum}/${limit}: (no OCR text)`,
        );
      } else if (nativeText) {
        emit(`OCR page ${pageNum}/${limit}: embedded text (${nativeText.length} chars)`);
      } else {
        emit(`OCR page ${pageNum}/${limit}: (empty embedded text)`);
      }

      const combinedLen = Math.max(nativeText.length, ocrText.length);
      const needsVision = visionEnabled() && (combinedLen < VISION_WEAK_CHARS || (weakNative && !ocrText));
      if (needsVision) {
        if (!png) png = renderMuPagePng(mupdf, page);
        visionText = await analyzeImageWithVision(png, { pageLabel: `page ${pageNum}/${limit}` }, emit);
        if (visionText) emit(`Vision page ${pageNum}/${limit}: ${previewText(visionText)}`);
      }

      return mergePageLayers({ pageNum, nativeText, ocrText, visionText });
    });

    const joined = pageResults.join('\n\n');
    emit(`PDF advanced extraction complete (${limit}/${totalPages} pages, ${joined.length} chars).`);
    return joined;
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // ignore
      }
    }
  }
}

async function extractImageAdvanced(buffer, fileName, onProgress) {
  const emit = typeof onProgress === 'function' ? onProgress : () => {};
  emit(`Advanced image OCR: ${fileName}`);
  const worker = await createOcrWorker(emit);
  try {
    const ocrText = await ocrImageBuffer(worker, buffer, emit, 'page 1/1');
    emit(ocrText ? `OCR page 1/1: ${previewText(ocrText)}` : 'OCR page 1/1: (no OCR text)');

    let visionText = '';
    const forceVision = envFlag('ENABLE_VISION_ANALYSIS', true);
    if (visionEnabled() && (ocrText.length < VISION_WEAK_CHARS || forceVision)) {
      // For engineering images/drawings always prefer vision when OCR is weak;
      // when OCR is strong, still run vision if text is sparse.
      const shouldVision = ocrText.length < Math.max(VISION_WEAK_CHARS * 3, 240);
      if (shouldVision) {
        const mime = /\.jpe?g$/i.test(fileName)
          ? 'image/jpeg'
          : /\.webp$/i.test(fileName)
            ? 'image/webp'
            : 'image/png';
        visionText = await analyzeImageWithVision(buffer, { pageLabel: 'page 1/1', mime }, emit);
        if (visionText) emit(`Vision page 1/1: ${previewText(visionText)}`);
      }
    }

    return mergePageLayers({ pageNum: 1, nativeText: '', ocrText, visionText });
  } finally {
    try {
      await worker.terminate();
    } catch {
      // ignore
    }
  }
}

module.exports = {
  extractPdfAdvanced,
  extractImageAdvanced,
  preprocessForOcr,
  visionEnabled,
  getOcrMode,
};

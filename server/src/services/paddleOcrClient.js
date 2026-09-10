/**
 * HTTP client for the local PaddleOCR microservice (server/ocr-service).
 * https://github.com/PaddlePaddle/PaddleOCR
 */

const DEFAULT_URL = 'http://127.0.0.1:8866';

function paddleBaseUrl() {
  return String(process.env.PADDLEOCR_URL || DEFAULT_URL).replace(/\/+$/, '');
}

function envFlag(name, fallback = false) {
  const raw = String(process.env[name] ?? '').trim().toLowerCase();
  if (!raw) return fallback;
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

/** @type {'auto' | 'paddle' | 'tesseract'} */
function getOcrEnginePreference() {
  const raw = String(process.env.OCR_ENGINE || 'auto').trim().toLowerCase();
  if (raw === 'paddle' || raw === 'paddleocr') return 'paddle';
  if (raw === 'tesseract') return 'tesseract';
  return 'auto';
}

let healthCache = { at: 0, ok: false, error: '' };

async function checkPaddleHealth(force = false) {
  const ttlMs = Math.max(3_000, Number(process.env.PADDLEOCR_HEALTH_TTL_MS || 15_000) || 15_000);
  if (!force && Date.now() - healthCache.at < ttlMs) {
    return healthCache;
  }
  const url = `${paddleBaseUrl()}/health`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Number(process.env.PADDLEOCR_HEALTH_TIMEOUT_MS || 4000) || 4000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    const body = await res.json().catch(() => ({}));
    healthCache = {
      at: Date.now(),
      ok: Boolean(res.ok && body?.ready !== false && body?.ok !== false),
      error: body?.error ? String(body.error) : '',
    };
  } catch (error) {
    healthCache = {
      at: Date.now(),
      ok: false,
      error: String(error?.message || error),
    };
  }
  return healthCache;
}

async function isPaddleOcrAvailable() {
  if (getOcrEnginePreference() === 'tesseract') return false;
  if (!envFlag('ENABLE_PADDLEOCR', true)) return false;
  const health = await checkPaddleHealth();
  return health.ok;
}

function buildMultipart(imageBuffer, filename) {
  const boundary = `----DocCheckPaddle${Date.now().toString(16)}`;
  const bytes = Buffer.isBuffer(imageBuffer) ? imageBuffer : Buffer.from(imageBuffer);
  const head = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: image/png\r\n\r\n`,
    'utf8',
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
  return {
    body: Buffer.concat([head, bytes, tail]),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

/**
 * Run PaddleOCR on an image buffer.
 * @param {Buffer} imageBuffer
 * @param {{ label?: string }} [opts]
 * @returns {Promise<string>}
 */
async function ocrWithPaddle(imageBuffer, opts = {}) {
  const label = opts.label || 'image';
  const url = `${paddleBaseUrl()}/ocr`;
  const safeName = `${String(label).replace(/[^\w.-]+/g, '_') || 'page'}.png`;
  const { body, contentType } = buildMultipart(imageBuffer, safeName);

  const controller = new AbortController();
  const timeoutMs = Math.max(10_000, Number(process.env.PADDLEOCR_TIMEOUT_MS || 120_000) || 120_000);
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body,
      signal: controller.signal,
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(payload?.detail || payload?.error || `PaddleOCR HTTP ${res.status}`);
    }
    return String(payload?.text || '').trim();
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  paddleBaseUrl,
  getOcrEnginePreference,
  checkPaddleHealth,
  isPaddleOcrAvailable,
  ocrWithPaddle,
};

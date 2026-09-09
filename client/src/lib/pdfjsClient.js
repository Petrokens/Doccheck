/** Shared pdf.js loader for browser + Electron. Avoids CDN worker mismatches. */

const MAX_PREVIEW_EDGE = 1400;
const MAX_THUMB_EDGE = 220;

export function previewPageLimit(fileSizeBytes, totalPages) {
  const mb = Number(fileSizeBytes || 0) / (1024 * 1024);
  const cap = mb >= 60 ? 12 : mb >= 25 ? 20 : 40;
  return Math.min(Math.max(1, totalPages || 1), cap);
}

export async function loadPdfjs() {
  const pdfjsLib = await import('pdfjs-dist');
  if (pdfjsLib?.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();
  }
  return pdfjsLib;
}

export async function openPdfFromFile(file) {
  const pdfjsLib = await loadPdfjs();
  const url = URL.createObjectURL(file);
  try {
    const pdf = await pdfjsLib.getDocument({
      url,
      disableRange: false,
      disableStream: false,
      disableAutoFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      isOffscreenCanvasSupported: false,
      verbosity: 0,
    }).promise;
    return { pdf, pdfjsLib, objectUrl: url };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function fitScale(viewport, maxEdge) {
  const edge = Math.max(viewport.width, viewport.height, 1);
  return edge > maxEdge ? maxEdge / edge : 1;
}

function placeholderDataUrl(pageNum) {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#334155';
  ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Page ${pageNum}`, canvas.width / 2, canvas.height / 2 - 8);
  ctx.font = '12px sans-serif';
  ctx.fillText('Preview unavailable', canvas.width / 2, canvas.height / 2 + 16);
  return canvas.toDataURL('image/jpeg', 0.8);
}

export async function renderPdfPagePreview(page, pdfjsLib, { maxEdge = MAX_PREVIEW_EDGE } = {}) {
  const AnnotationMode = pdfjsLib.AnnotationMode || { DISABLE: 0 };
  const base = page.getViewport({ scale: 1 });
  const scales = [
    fitScale(base, maxEdge),
    fitScale(base, Math.min(maxEdge, 900)),
    fitScale(base, 640),
  ];

  let lastError = null;
  for (const scale of scales) {
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) continue;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const attempts = [
      {
        canvas,
        canvasContext: ctx,
        viewport,
        annotationMode: AnnotationMode.DISABLE,
        background: '#ffffff',
        intent: 'display',
      },
      {
        canvasContext: ctx,
        viewport,
        annotationMode: AnnotationMode.DISABLE,
        background: '#ffffff',
      },
    ];

    for (const params of attempts) {
      try {
        await page.render(params).promise;
        return canvas.toDataURL('image/jpeg', 0.72);
      } catch (error) {
        lastError = error;
      }
    }
  }

  if (lastError) {
    const msg = String(lastError.message || lastError);
    if (!/toHex is not a function/i.test(msg)) {
      throw lastError;
    }
  }
  return null;
}

export async function renderPdfPageSafe(page, pdfjsLib, pageNum, options) {
  try {
    const url = await renderPdfPagePreview(page, pdfjsLib, options);
    return url || placeholderDataUrl(pageNum);
  } catch {
    return placeholderDataUrl(pageNum);
  }
}

export { MAX_PREVIEW_EDGE, MAX_THUMB_EDGE };

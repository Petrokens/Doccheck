let activeViewer = null;

function filenameFromDisposition(header, fallback) {
  const raw = String(header || '');
  const star = raw.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  const plain = raw.match(/filename\s*=\s*"?([^";]+)"?/i);
  const value = star?.[1] || plain?.[1];
  if (!value) return fallback;
  try {
    return decodeURIComponent(value.trim());
  } catch {
    return value.trim() || fallback;
  }
}

function closeViewer() {
  if (!activeViewer) return;
  activeViewer.cleanup();
}

export function openPdfInApp(blob, filename = 'report.pdf') {
  if (!(blob instanceof Blob) || blob.size === 0) {
    throw new Error('PDF is empty.');
  }

  closeViewer();

  const pdfBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
  const url = URL.createObjectURL(pdfBlob);
  const overlay = document.createElement('div');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', filename);
  overlay.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:2147483000',
    'display:flex',
    'flex-direction:column',
    'background:#07111a',
  ].join(';');

  overlay.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;background:#0f3d3e;color:#fff;font:600 14px Barlow,Segoe UI,sans-serif;">
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${filename.replace(/[<>&"]/g, '')}</span>
      <div style="display:flex;gap:8px;flex-shrink:0;">
        <button type="button" data-print style="height:32px;padding:0 12px;border:1px solid rgba(255,255,255,.28);border-radius:8px;background:transparent;color:#fff;cursor:pointer;">Print</button>
        <button type="button" data-download style="height:32px;padding:0 12px;border:1px solid rgba(255,255,255,.28);border-radius:8px;background:transparent;color:#fff;cursor:pointer;">Download</button>
        <button type="button" data-close style="height:32px;padding:0 12px;border:0;border-radius:8px;background:#1d4ed8;color:#fff;cursor:pointer;">Close</button>
      </div>
    </div>
    <iframe title="${filename.replace(/[<>&"]/g, '')}" src="${url}" style="flex:1;width:100%;border:0;background:#fff;"></iframe>
  `;

  const iframe = overlay.querySelector('iframe');
  const onKey = (event) => {
    if (event.key === 'Escape') closeViewer();
  };

  const cleanup = () => {
    document.removeEventListener('keydown', onKey);
    overlay.remove();
    URL.revokeObjectURL(url);
    if (activeViewer?.overlay === overlay) activeViewer = null;
  };

  overlay.querySelector('[data-close]').addEventListener('click', closeViewer);
  overlay.querySelector('[data-download]').addEventListener('click', () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  });
  overlay.querySelector('[data-print]').addEventListener('click', () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      window.open(url, '_blank');
    }
  });

  document.addEventListener('keydown', onKey);
  document.body.appendChild(overlay);
  overlay.querySelector('[data-close]').focus();
  activeViewer = { overlay, cleanup };
  return cleanup;
}

export { filenameFromDisposition };

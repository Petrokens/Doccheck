function parseVersion(value) {
  return String(value || '')
    .trim()
    .replace(/^v/i, '')
    .split('.')
    .map((part) => {
      const n = parseInt(part, 10);
      return Number.isFinite(n) ? n : 0;
    });
}

function compareVersions(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  const len = Math.max(left.length, right.length);
  for (let i = 0; i < len; i += 1) {
    const d = (left[i] || 0) - (right[i] || 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

function getLatestAppVersion() {
  return String(process.env.APP_VERSION || '1.1.0').trim() || '1.1.0';
}

function getAppUpdateInfo() {
  const version = getLatestAppVersion();
  return {
    ok: true,
    product: 'DocCheck AI',
    version,
    forceUpdate: String(process.env.APP_FORCE_UPDATE || '').trim() === '1',
    message: String(process.env.APP_UPDATE_MESSAGE || '').trim()
      || 'A newer DocCheck AI version is available. Update to keep using the latest QA/QC features.',
    downloadUrl: String(process.env.APP_UPDATE_URL || '').trim(),
  };
}

module.exports = { parseVersion, compareVersions, getLatestAppVersion, getAppUpdateInfo };

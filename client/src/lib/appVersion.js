export function parseVersion(value) {
  return String(value || '')
    .trim()
    .replace(/^v/i, '')
    .split('.')
    .map((part) => {
      const n = parseInt(part, 10);
      return Number.isFinite(n) ? n : 0;
    });
}

export function compareVersions(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  const len = Math.max(left.length, right.length);
  for (let i = 0; i < len; i += 1) {
    const d = (left[i] || 0) - (right[i] || 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

export function isOutdated(running, latest) {
  return compareVersions(running, latest) < 0;
}

function sanitizeMarkdown(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/\son\w+\s*=/gi, ' ')
    .slice(0, 1_500_000);
}

function isReportId(id) {
  return /^[a-zA-Z0-9_-]{8,32}$/.test(String(id || ''));
}

function canAccessReport(req, record) {
  if (!record) return false;
  if (Number(req.user?.role_id) === 1) return true;
  return String(record.checked_by_user_id) === String(req.user?.user_id || '');
}

module.exports = { sanitizeMarkdown, isReportId, canAccessReport };

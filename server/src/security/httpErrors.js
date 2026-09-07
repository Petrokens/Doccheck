function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function publicError(res, status, message) {
  return res.status(status).json({ error: message });
}

function internalError(res, error, message = 'Request failed') {
  console.error(message, error?.message || error);
  if (isProduction()) return res.status(500).json({ error: message });
  return res.status(500).json({ error: message, details: error?.message });
}

module.exports = { isProduction, publicError, internalError };

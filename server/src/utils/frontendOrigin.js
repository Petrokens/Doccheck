function frontendOrigin() {
  return String(process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')[0]
    .trim()
    .replace(/\/$/, '');
}

module.exports = { frontendOrigin };

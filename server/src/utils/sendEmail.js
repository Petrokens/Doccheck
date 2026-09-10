const nodemailer = require('nodemailer');

let transporter = null;

function smtpFrom() {
  const from = String(process.env.SMTP_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
  if (from) return from;
  return 'DocCheck AI <noreply@localhost>';
}

function smtpUser() {
  return String(process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
}

function smtpPass() {
  return String(process.env.SMTP_PASS || process.env.EMAIL_PASS || '')
    .replace(/\s+/g, '')
    .trim();
}

function isSmtpConfigured() {
  return Boolean(
    String(process.env.SMTP_HOST || '').trim()
    && smtpUser()
    && smtpPass(),
  );
}

function getTransporter() {
  if (transporter) return transporter;
  if (!isSmtpConfigured()) return null;

  const port = Number(process.env.SMTP_PORT || 587);
  const secureEnv = String(process.env.SMTP_SECURE || '').trim().toLowerCase();
  const secure = secureEnv === 'true' || secureEnv === '1' || port === 465;

  transporter = nodemailer.createTransport({
    host: String(process.env.SMTP_HOST).trim(),
    port,
    secure,
    auth: {
      user: smtpUser(),
      pass: smtpPass(),
    },
  });
  return transporter;
}

async function sendEmail({ to, subject, html, text }) {
  const transport = getTransporter();
  if (!transport) {
    console.warn('Email skipped: set SMTP_HOST, SMTP_USER (or EMAIL_USER), and SMTP_PASS (or EMAIL_PASS) in server/.env');
    const err = new Error('Email is not configured on the server.');
    err.code = 'SMTP_NOT_CONFIGURED';
    throw err;
  }

  const info = await transport.sendMail({
    from: smtpFrom(),
    to,
    subject,
    text,
    html,
  });

  if (Array.isArray(info.rejected) && info.rejected.length) {
    throw new Error(`SMTP rejected recipient(s): ${info.rejected.join(', ')}`);
  }
  return info;
}

function frontendOrigin() {
  return String(process.env.FRONTEND_URL || 'http://localhost:5174')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)[0] || 'http://localhost:5174';
}

module.exports = { sendEmail, frontendOrigin, isSmtpConfigured };

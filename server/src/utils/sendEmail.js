const nodemailer = require('nodemailer');

let transporter;

function fromAddress() {
  const from = String(process.env.SMTP_FROM || process.env.SMTP_USER || '').trim();
  return from || 'Petrolenz QA/QC <noreply@localhost>';
}

function asList(to) {
  return (Array.isArray(to) ? to : [to])
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);
}

function smtpConfigured() {
  return Boolean(
    String(process.env.SMTP_HOST || '').trim()
    && String(process.env.SMTP_USER || '').trim()
    && String(process.env.SMTP_PASS || '').trim(),
  );
}

function getTransporter() {
  if (!smtpConfigured()) return null;
  if (transporter) return transporter;

  const port = Number(process.env.SMTP_PORT || 587);
  const secureEnv = String(process.env.SMTP_SECURE || '').trim().toLowerCase();
  const secure = secureEnv === 'true' || secureEnv === '1' || port === 465;

  transporter = nodemailer.createTransport({
    host: String(process.env.SMTP_HOST).trim(),
    port,
    secure,
    auth: {
      user: String(process.env.SMTP_USER).trim(),
      pass: String(process.env.SMTP_PASS).trim(),
    },
  });
  return transporter;
}

async function sendEmail({ to, subject, html, text }) {
  const recipients = asList(to);
  if (!recipients.length) return { skipped: true, reason: 'no-recipient' };

  const mailer = getTransporter();
  if (!mailer) {
    console.warn('Email skipped: set SMTP_HOST, SMTP_USER, and SMTP_PASS in server/.env');
    return { skipped: true, reason: 'not-configured' };
  }

  const info = await mailer.sendMail({
    from: fromAddress(),
    to: recipients.join(', '),
    subject,
    html,
    text,
  });
  return { skipped: false, provider: 'smtp', id: info?.messageId || null };
}

function frontendOrigin() {
  return String(process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')[0]
    .trim()
    .replace(/\/$/, '');
}

module.exports = { sendEmail, frontendOrigin };

const { Resend } = require('resend');
const nodemailer = require('nodemailer');

function fromAddress() {
  return String(process.env.RESEND_FROM || 'Petrolenz QA/QC <noreply@petrolenz.com>')
    .trim()
    .replace(/\s+/g, ' ');
}

function asList(to) {
  return (Array.isArray(to) ? to : [to])
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);
}

async function sendWithResend({ to, subject, html, text }) {
  const key = String(process.env.RESEND_API_KEY || '').trim();
  if (!key) return null;
  const resend = new Resend(key);
  const { data, error } = await resend.emails.send({
    from: fromAddress(),
    to,
    subject,
    html,
    text,
  });
  if (error) {
    const message = error.message || (typeof error === 'string' ? error : 'Resend send failed');
    throw new Error(message);
  }
  return { skipped: false, provider: 'resend', id: data?.id || null };
}

async function sendWithGmail({ to, subject, html, text }) {
  const user = String(process.env.EMAIL_USER || '').trim();
  const pass = String(process.env.EMAIL_PASS || '').trim();
  if (!user || !pass) return null;
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
  await transporter.sendMail({
    from: fromAddress(),
    to,
    subject,
    html,
    text,
  });
  return { skipped: false, provider: 'gmail' };
}

async function sendEmail({ to, subject, html, text }) {
  const recipients = asList(to);
  if (!recipients.length) return { skipped: true, reason: 'no-recipient' };

  const resendResult = await sendWithResend({ to: recipients, subject, html, text });
  if (resendResult) return resendResult;

  const gmailResult = await sendWithGmail({ to: recipients.join(', '), subject, html, text });
  if (gmailResult) return gmailResult;

  console.warn('Email skipped: set RESEND_API_KEY (recommended) or EMAIL_USER / EMAIL_PASS');
  return { skipped: true, reason: 'not-configured' };
}

function frontendOrigin() {
  return String(process.env.FRONTEND_URL || 'http://localhost:5174')
    .split(',')[0]
    .trim()
    .replace(/\/$/, '');
}

module.exports = { sendEmail, frontendOrigin };

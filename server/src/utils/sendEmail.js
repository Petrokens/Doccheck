const nodemailer = require('nodemailer');

async function sendEmail({ to, subject, html, text }) {
  const user = String(process.env.EMAIL_USER || '').trim();
  const pass = String(process.env.EMAIL_PASS || '').trim();
  if (!user || !pass) {
    console.warn('Email skipped: EMAIL_USER / EMAIL_PASS not set');
    return { skipped: true };
  }
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
  await transporter.sendMail({ from: user, to, subject, html, text });
  return { skipped: false };
}

module.exports = { sendEmail };

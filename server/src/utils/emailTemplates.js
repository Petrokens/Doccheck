function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function layout({ heading, bodyHtml }) {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f4f6f8;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background:#0f3d3e;color:#ffffff;padding:20px 28px;">
                <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;opacity:0.8;">Petrolenz</div>
                <div style="font-size:22px;font-weight:700;margin-top:4px;">QA/QC</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;">${escapeHtml(heading)}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 24px;color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb;">
                This message was sent by Petrolenz QA/QC. If you were not expecting it, ignore this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function credentialsEmail({ username, email, password, loginUrl }) {
  const heading = 'Your Petrolenz login credentials';
  const bodyHtml = `
    <p style="margin:0 0 12px;">Hi ${escapeHtml(username || 'there')},</p>
    <p style="margin:0 0 16px;">A Master Admin created your Petrolenz QA/QC account. Use these details to sign in:</p>
    <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#f8fafc;border-radius:8px;margin:0 0 16px;">
      <tr><td style="padding:12px 16px;font-size:14px;"><strong>Email</strong><br>${escapeHtml(email)}</td></tr>
      <tr><td style="padding:0 16px 12px;font-size:14px;"><strong>Password</strong><br>${escapeHtml(password)}</td></tr>
    </table>
    <p style="margin:0 0 16px;"><a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:#0f3d3e;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">Open login</a></p>
    <p style="margin:0;color:#6b7280;font-size:13px;">Each login also requires a one-time code emailed to you. Change this password after you first sign in.</p>
  `;
  return {
    subject: 'Your Petrolenz QA/QC login credentials',
    html: layout({ heading, bodyHtml }),
    text: [
      `Hi ${username || 'there'},`,
      'A Master Admin created your Petrolenz QA/QC account.',
      `Email: ${email}`,
      `Password: ${password}`,
      `Login: ${loginUrl}`,
      'Each login also requires a one-time code emailed to you.',
    ].join('\n'),
  };
}

function loginOtpEmail({ username, otp }) {
  const heading = 'Your login verification code';
  const bodyHtml = `
    <p style="margin:0 0 12px;">Hi ${escapeHtml(username || 'there')},</p>
    <p style="margin:0 0 16px;">Use this one-time code to finish signing in to Petrolenz QA/QC. It expires in 10 minutes.</p>
    <p style="margin:0 0 16px;font-size:32px;letter-spacing:0.24em;font-weight:700;color:#0f3d3e;">${escapeHtml(otp)}</p>
    <p style="margin:0;color:#6b7280;font-size:13px;">If you did not try to log in, you can ignore this email.</p>
  `;
  return {
    subject: 'Your Petrolenz login code',
    html: layout({ heading, bodyHtml }),
    text: `Hi ${username || 'there'},\nYour Petrolenz login code is ${otp}. It expires in 10 minutes.`,
  };
}

function announcementEmail({ title, body, username }) {
  const heading = title;
  const bodyHtml = `
    <p style="margin:0 0 12px;">Hi ${escapeHtml(username || 'there')},</p>
    <p style="margin:0 0 16px;">A new announcement was posted in Petrolenz QA/QC.</p>
    <div style="white-space:pre-wrap;line-height:1.5;background:#f8fafc;border-radius:8px;padding:16px;">${escapeHtml(body)}</div>
  `;
  return {
    subject: `Announcement: ${title}`,
    html: layout({ heading, bodyHtml }),
    text: `Hi ${username || 'there'},\n\n${title}\n\n${body}`,
  };
}

function passwordResetEmail({ resetUrl }) {
  const heading = 'Reset your password';
  const bodyHtml = `
    <p style="margin:0 0 16px;">Use the button below to choose a new Petrolenz QA/QC password. This link expires in 30 minutes.</p>
    <p style="margin:0;"><a href="${escapeHtml(resetUrl)}" style="display:inline-block;background:#0f3d3e;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">Reset password</a></p>
  `;
  return {
    subject: 'Petrolenz QA/QC password reset',
    html: layout({ heading, bodyHtml }),
    text: `Reset your password: ${resetUrl}`,
  };
}

module.exports = {
  credentialsEmail,
  loginOtpEmail,
  announcementEmail,
  passwordResetEmail,
};

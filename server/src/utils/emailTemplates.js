function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const BRAND = {
  teal: '#0f3d3e',
  tealDeep: '#0a2c2d',
  tealSoft: '#e8f2f2',
  accent: '#1a6b6c',
  ink: '#111827',
  muted: '#6b7280',
  line: '#e5e7eb',
  page: '#eef2f4',
  white: '#ffffff',
};

function primaryButton(href, label) {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 20px;">
      <tr>
        <td style="border-radius:10px;background:${BRAND.teal};">
          <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:600;line-height:1;color:${BRAND.white};text-decoration:none;border-radius:10px;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>`;
}

function layout({ preheader, heading, bodyHtml, eyebrow }) {
  const safePreheader = escapeHtml(preheader || heading || '');
  const safeEyebrow = escapeHtml(eyebrow || 'Security notice');
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${escapeHtml(heading || 'DocCheck AI')}</title>
    <!--[if mso]>
    <style type="text/css">
      body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
    </style>
    <![endif]-->
  </head>
  <body style="margin:0;padding:0;background:${BRAND.page};font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.ink};-webkit-font-smoothing:antialiased;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
      ${safePreheader}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.page};padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;background:${BRAND.white};border-radius:16px;overflow:hidden;border:1px solid ${BRAND.line};box-shadow:0 8px 24px rgba(15,61,62,0.08);">
            <tr>
              <td style="background:${BRAND.tealDeep};padding:0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding:22px 28px 18px;background:linear-gradient(135deg, ${BRAND.tealDeep} 0%, ${BRAND.teal} 100%);">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td valign="middle">
                            <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.72);font-weight:600;">DocCheck AI</div>
                            <div style="margin-top:4px;font-size:22px;line-height:1.2;font-weight:700;color:${BRAND.white};letter-spacing:0.02em;">QA/QC Platform</div>
                          </td>
                          <td valign="middle" align="right" style="width:88px;">
                            <div style="display:inline-block;padding:7px 10px;border-radius:999px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.18);color:${BRAND.white};font-size:11px;font-weight:600;letter-spacing:0.04em;">SECURE</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="height:4px;background:${BRAND.accent};font-size:0;line-height:0;">&nbsp;</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px 8px;">
                <div style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.accent};">${safeEyebrow}</div>
                <h1 style="margin:0 0 18px;font-size:24px;line-height:1.3;font-weight:700;color:${BRAND.ink};">${escapeHtml(heading)}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.tealSoft};border-radius:12px;">
                  <tr>
                    <td style="padding:14px 16px;font-size:12px;line-height:1.55;color:${BRAND.teal};">
                      For your security, never share codes or passwords. DocCheck AI staff will never ask for them.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 24px;border-top:1px solid ${BRAND.line};background:#fafbfc;">
                <div style="font-size:12px;line-height:1.55;color:${BRAND.muted};">
                  This message was sent by <strong style="color:${BRAND.ink};">DocCheck AI</strong>. If you were not expecting it, you can safely ignore this email.
                </div>
              </td>
            </tr>
          </table>
          <div style="margin-top:16px;font-size:11px;line-height:1.5;color:#9ca3af;text-align:center;">
            Engineering document QA/QC · Automated verification
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function credentialsEmail({ username, email, password, loginUrl }) {
  const heading = 'Your account is ready';
  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:${BRAND.ink};">Hi ${escapeHtml(username || 'there')},</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${BRAND.muted};">A Master Admin created your DocCheck AI account. Use the credentials below to sign in.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 22px;background:#f8fafc;border:1px solid ${BRAND.line};border-radius:12px;">
      <tr>
        <td style="padding:16px 18px;border-bottom:1px solid ${BRAND.line};">
          <div style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.muted};">Email</div>
          <div style="margin-top:6px;font-size:15px;font-weight:600;color:${BRAND.ink};word-break:break-all;">${escapeHtml(email)}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 18px;">
          <div style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.muted};">Temporary password</div>
          <div style="margin-top:6px;font-size:15px;font-weight:600;color:${BRAND.ink};font-family:Consolas,'Courier New',monospace;">${escapeHtml(password)}</div>
        </td>
      </tr>
    </table>
    ${primaryButton(loginUrl, 'Open login')}
    <p style="margin:0;font-size:13px;line-height:1.55;color:${BRAND.muted};">Sign-in may also require a one-time email code. Change this password after your first login.</p>
  `;
  return {
    subject: 'Your DocCheck AI login credentials',
    html: layout({
      preheader: 'Your DocCheck AI account credentials are ready.',
      eyebrow: 'Account access',
      heading,
      bodyHtml,
    }),
    text: [
      `Hi ${username || 'there'},`,
      'A Master Admin created your DocCheck AI account.',
      `Email: ${email}`,
      `Password: ${password}`,
      `Login: ${loginUrl}`,
      'Sign-in may also require a one-time email code.',
    ].join('\n'),
  };
}

function loginOtpEmail({ username, otp }) {
  const sentAt = new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
  const digits = String(otp || '')
    .split('')
    .map(
      (d) => `
      <td align="center" style="width:42px;height:52px;background:${BRAND.white};border:1px solid ${BRAND.line};border-radius:10px;font-size:24px;font-weight:700;color:${BRAND.teal};font-family:Consolas,'Courier New',monospace;">
        ${escapeHtml(d)}
      </td>
      <td style="width:8px;font-size:0;line-height:0;">&nbsp;</td>`,
    )
    .join('');

  const heading = 'Your login verification code';
  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:${BRAND.ink};">Hi ${escapeHtml(username || 'there')},</p>
    <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:${BRAND.muted};">Use this one-time code to finish signing in to DocCheck AI. It expires in <strong style="color:${BRAND.ink};">10 minutes</strong>.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px;background:${BRAND.tealSoft};border:1px solid #d5e6e6;border-radius:14px;">
      <tr>
        <td style="padding:22px 18px;" align="center">
          <div style="margin:0 0 12px;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.accent};">Verification code</div>
          <table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;">
            <tr>${digits}</tr>
          </table>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;">
      <tr>
        <td style="font-size:13px;line-height:1.55;color:${BRAND.muted};">
          Sent at <strong style="color:${BRAND.ink};">${escapeHtml(sentAt)} UTC</strong>. Earlier codes are no longer valid.
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;line-height:1.55;color:${BRAND.muted};">If you did not try to log in, you can ignore this email.</p>
  `;
  return {
    subject: `Your DocCheck AI login code (${sentAt} UTC)`,
    html: layout({
      preheader: `Your DocCheck AI login code is ${otp}. Expires in 10 minutes.`,
      eyebrow: 'Login verification',
      heading,
      bodyHtml,
    }),
    text: `Hi ${username || 'there'},\nYour DocCheck AI login code is ${otp}. Sent at ${sentAt} UTC. It expires in 10 minutes. Earlier codes are no longer valid.`,
  };
}

function announcementEmail({ title, body, username }) {
  const heading = title;
  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:${BRAND.ink};">Hi ${escapeHtml(username || 'there')},</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:${BRAND.muted};">A new announcement was posted in DocCheck AI.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid ${BRAND.line};border-radius:12px;">
      <tr>
        <td style="padding:18px;font-size:14px;line-height:1.65;color:${BRAND.ink};white-space:pre-wrap;">${escapeHtml(body)}</td>
      </tr>
    </table>
  `;
  return {
    subject: `Announcement: ${title}`,
    html: layout({
      preheader: String(title || 'New DocCheck AI announcement'),
      eyebrow: 'Announcement',
      heading,
      bodyHtml,
    }),
    text: `Hi ${username || 'there'},\n\n${title}\n\n${body}`,
  };
}

function passwordResetEmail({ resetUrl }) {
  const heading = 'Reset your password';
  const bodyHtml = `
    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:${BRAND.muted};">Use the button below to choose a new DocCheck AI password. This link expires in <strong style="color:${BRAND.ink};">30 minutes</strong>.</p>
    ${primaryButton(resetUrl, 'Reset password')}
    <p style="margin:0;font-size:13px;line-height:1.55;color:${BRAND.muted};">If the button does not work, copy and paste this link into your browser:<br><a href="${escapeHtml(resetUrl)}" style="color:${BRAND.accent};word-break:break-all;">${escapeHtml(resetUrl)}</a></p>
  `;
  return {
    subject: 'DocCheck AI password reset',
    html: layout({
      preheader: 'Reset your DocCheck AI password. This link expires in 30 minutes.',
      eyebrow: 'Password reset',
      heading,
      bodyHtml,
    }),
    text: `Reset your password: ${resetUrl}`,
  };
}

module.exports = {
  credentialsEmail,
  loginOtpEmail,
  announcementEmail,
  passwordResetEmail,
};

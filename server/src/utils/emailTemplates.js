function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function shell({ title, bodyHtml }) {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Segoe UI,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;padding:28px 24px;border:1px solid #e2e8f0;">
            <tr><td style="font-size:18px;font-weight:700;color:#0f3d3e;padding-bottom:12px;">${escapeHtml(title)}</td></tr>
            <tr><td style="font-size:15px;line-height:1.55;color:#334155;">${bodyHtml}</td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function loginOtpEmail({ username, otp }) {
  const safeName = escapeHtml(username || 'there');
  const safeOtp = escapeHtml(otp);
  return {
    subject: 'Your DocCheck AI login code',
    html: shell({
      title: 'Login verification',
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${safeName},</p>
        <p style="margin:0 0 16px;">Use this one-time code to finish signing in. It expires in <strong>10 minutes</strong>.</p>
        <p style="margin:0 0 8px;font-size:13px;color:#64748b;">Your code</p>
        <p style="margin:0 0 16px;font-size:28px;font-weight:700;font-family:Consolas,Menlo,monospace;letter-spacing:0.12em;color:#0f3d3e;">${safeOtp}</p>
        <p style="margin:0;color:#64748b;font-size:13px;">If you requested more than one code, use the <strong>latest</strong> email only.</p>
      `,
    }),
    text: `Hi ${username || 'there'},\nYour DocCheck AI login code is: ${otp}\nIt expires in 10 minutes.\nIf you requested more than one code, use the latest email only.`,
  };
}

function announcementEmail({ title, body, username }) {
  return {
    subject: `Announcement: ${title}`,
    html: shell({
      title: escapeHtml(title),
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${escapeHtml(username || 'there')},</p>
        <p style="margin:0 0 16px;">A new announcement was posted in DocCheck AI.</p>
        <div style="margin:0;white-space:pre-wrap;">${escapeHtml(body)}</div>
      `,
    }),
    text: `${title}\n\n${body}`,
  };
}

module.exports = {
  loginOtpEmail,
  announcementEmail,
};

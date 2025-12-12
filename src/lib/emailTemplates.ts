// Reusable email templates for transactional emails
// Keep inline styles for maximum client compatibility.

export function generateOTPEmail(params: {
  code: string;
  expiresInMinutes?: number;
  appName?: string;
}) {
  const { code, expiresInMinutes = 5, appName = 'LankaQR' } = params;
  const subject = `${appName} - Email Verification Code`;
  const text = `Your verification code is ${code}. It expires in ${expiresInMinutes} minutes.`;

  const html = `
  <!doctype html>
  <html lang="en">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(subject)}</title>
      <style>
        /* Clients ignore most styles here; keep critical styles inline in markup */
        @media (prefers-color-scheme: dark) {
          .bg { background-color: #0b1220 !important; }
          .card { background-color: #0f172a !important; color: #e5e7eb !important; }
          .muted { color: #93a3b8 !important; }
        }
      </style>
    </head>
    <body style="margin:0;padding:0;background:#f3f4f6;" class="bg">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f3f4f6;padding:24px 0;">
        <tr>
          <td align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.12);" class="card">
              <tr>
                <td style="padding:24px 28px 8px 28px;text-align:center;">
                  <div style="font-size:18px;font-weight:700;color:#111827;letter-spacing:0.2px;">${escapeHtml(appName)}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:0 28px 4px 28px;text-align:center;">
                  <h1 style="margin:16px 0 8px 0;font-size:20px;line-height:28px;color:#111827;">Verify Your Email</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:0 28px 8px 28px;text-align:center;">
                  <p style="margin:0;font-size:14px;line-height:22px;color:#4b5563;" class="muted">Use the code below to verify your email. For your security, it expires in ${expiresInMinutes} minutes.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 28px 8px 28px;text-align:center;">
                  <div style="display:inline-block;padding:16px 24px;border:1px solid #e5e7eb;border-radius:10px;background:#fafafa;">
                    <div style="font-size:28px;font-weight:800;letter-spacing:4px;color:#111827;font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">
                      ${escapeHtml(code)}
                    </div>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 28px 4px 28px;text-align:center;">
                  <p style="margin:0;font-size:12px;color:#6b7280;" class="muted">If you didn’t request this, you can ignore this email.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:24px 28px 28px 28px;text-align:center;border-top:1px solid #f3f4f6;">
                  <p style="margin:8px 0 0 0;font-size:12px;color:#9ca3af;" class="muted">© ${new Date().getFullYear()} ${escapeHtml(appName)}. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;

  return { subject, text, html };
}

export function generateSetPasswordEmail(params: { name: string; email: string; link: string; appName?: string }) {
  const { name, email, link, appName = 'LankaQR' } = params;
  const subject = `${appName} - Set your admin password`;
  const text = `Hello ${name},\n\nPlease set your admin password by visiting the link: ${link}\n\nIf you didn't expect this, ignore.`;

  const html = `
  <!doctype html>
  <html lang="en">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(subject)}</title>
    </head>
    <body style="margin:0;padding:24px;background:#f3f4f6;font-family:Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;">
        <h2 style="margin:0 0 8px 0;color:#111827">${escapeHtml(appName)}</h2>
        <p style="color:#374151">Hello ${escapeHtml(name || email)},</p>
        <p style="color:#374151">An administrator account was created for you. Click the button below to set your password. This link can be used once and will expire shortly.</p>
        <div style="text-align:center;margin:20px 0;">
          <a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 18px;background:#0b61ff;color:#fff;border-radius:8px;text-decoration:none;">Set password</a>
        </div>
        <p style="color:#6b7280;font-size:13px">If you didn't expect this, ignore this email or contact the site administrator.</p>
        <hr style="border:none;border-top:1px solid #eef2f7;margin:20px 0;" />
        <p style="color:#9ca3af;font-size:12px">© ${new Date().getFullYear()} ${escapeHtml(appName)}. All rights reserved.</p>
      </div>
    </body>
  </html>
  `;

  return { subject, text, html };
}

export function generateSignupSuccessEmail(params: {
  name?: string | null;
  accountType: 'individual' | 'company';
  signinUrl: string;
  appName?: string;
}) {
  const { name, accountType, signinUrl, appName = 'LankaQR' } = params;
  const greetingName = (name && name.trim()) || 'there';
  const subject = `${appName} - Registration complete`;
  const accountLabel = accountType === 'company' ? 'company workspace' : 'merchant dashboard';
  const text = `Hi ${greetingName},\n\nYour ${accountLabel} is ready. Sign in to start accepting LankaQR payments: ${signinUrl}\n\nThanks,\n${appName} Team`;

  const html = `
  <!doctype html>
  <html lang="en">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(subject)}</title>
    </head>
    <body style="margin:0;padding:24px;background:#f3f4f6;font-family:Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.08);">
        <h2 style="margin:0 0 4px 0;color:#111827;font-size:22px;">${escapeHtml(appName)}</h2>
        <p style="margin:8px 0 0 0;color:#4b5563;font-size:15px;">Hi ${escapeHtml(greetingName)},</p>
        <p style="margin:16px 0;color:#374151;font-size:15px;line-height:24px;">Your ${escapeHtml(accountLabel)} is ready. Sign in now to access QR codes, manage transactions, and complete your onboarding.</p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${escapeHtml(signinUrl)}" style="display:inline-block;padding:12px 20px;background:#0f62fe;color:#ffffff;border-radius:999px;text-decoration:none;font-weight:600;">Go to sign in</a>
        </div>
        <p style="margin:0;color:#6b7280;font-size:13px;line-height:22px;">If the button doesn’t work, copy and paste this link into your browser:</p>
        <p style="margin:8px 0 0 0;color:#2563eb;font-size:13px;word-break:break-all;">${escapeHtml(signinUrl)}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;" />
        <p style="margin:0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} ${escapeHtml(appName)}. All rights reserved.</p>
      </div>
    </body>
  </html>
  `;

  return { subject, text, html };
}

export function generateReferralConfirmedEmail(params: { referrerName?: string | null; referredName?: string | null; appName?: string; }) {
  const { referrerName, referredName, appName = 'LankaQR' } = params;
  const subject = `${appName} - Referral confirmed`;
  const refName = (referrerName && referrerName.trim()) || 'there';
  const referredLabel = (referredName && referredName.trim()) || 'a user you referred';
  const text = `Hi ${refName},

Good news — ${referredLabel} has completed KYC and your referral has been confirmed. Thank you!

— ${appName} Team`;

  const html = `
  <!doctype html>
  <html lang="en">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(subject)}</title>
    </head>
    <body style="margin:0;padding:24px;background:#f3f4f6;font-family:Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;">
        <h2 style="margin:0 0 4px 0;color:#111827;font-size:22px;">${escapeHtml(appName)}</h2>
        <p style="margin:8px 0 0 0;color:#374151">Hi ${escapeHtml(refName)},</p>
        <p style="margin:16px 0;color:#374151;font-size:15px;line-height:24px;">Good news — ${escapeHtml(referredLabel)} has completed KYC and your referral has been confirmed. Your referral points have been updated.</p>
        <p style="margin:0;color:#6b7280;font-size:13px;line-height:22px;">Thank you for sharing ${escapeHtml(appName)}.</p>
        <hr style="border:none;border-top:1px solid #eef2f7;margin:20px 0;" />
        <p style="color:#9ca3af;font-size:12px">© ${new Date().getFullYear()} ${escapeHtml(appName)}. All rights reserved.</p>
      </div>
    </body>
  </html>
  `;

  return { subject, text, html };
}

function escapeHtml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

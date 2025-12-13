import nodemailer from 'nodemailer';
import { generatePhpposSetupEmail } from './emailTemplates';

type Recipient = { email: string; name?: string | null };

// `to` may be a single email, a single recipient object, an array of emails, or an array of recipient objects.
export async function sendPhpposSetupEmail(to: string | Recipient | Array<string | Recipient>, uid: string) {
  const raw = Array.isArray(to) ? to : [to];
  const recipients: Recipient[] = raw.map(item => {
    if (!item) return null as any;
    if (typeof item === 'string') return { email: item, name: undefined };
    return { email: item.email, name: item.name } as Recipient;
  }).filter(r => r && r.email) as Recipient[];
  if (!recipients.length) return;

  const SMTP_HOST = process.env.SMTP_HOST;
  const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;
  const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
  const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER || 'no-reply@lankaqr.local';
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('SMTP not configured — skipping PHPPOS setup email');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT || 587,
    secure: SMTP_SECURE || SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const appOriginRaw = process.env.NEXT_PUBLIC_APP_ORIGIN || 'https://qr.b2u.app';
  const appOrigin = appOriginRaw.replace(/\/$/, '');
  const phpposToken = (process.env.PHPPOS_WEBHOOK_TOKEN || 'PHPPOS_WEBHOOK_TOKEN').toString();

  const stepFiles = ['step1.png', 'step2.png', 'step3.png'];

  // Always resolve attachments from the public URL (`${appOrigin}/possteps/...`).
  // This avoids relying on local filesystem availability in production builds.
  const attachments: Array<{ filename: string; cid: string }> = stepFiles.map((f, i) => ({ filename: f, cid: `posstep${i + 1}` }));

  // Send personalized email to each recipient separately so greetings are individualized.
  for (const r of recipients) {
    try {
      const { subject, text, html } = generatePhpposSetupEmail({ name: r.name || null, uid, appName: 'LankaQR' });
      const finalText = text
        .replaceAll('NEXT_PUBLIC_APP_ORIGIN', appOrigin)
        .replaceAll('PHPPOS_WEBHOOK_TOKEN', phpposToken)
        .replaceAll('{uid}', uid);
      const finalHtml = html
        .replaceAll('NEXT_PUBLIC_APP_ORIGIN', appOrigin)
        .replaceAll('PHPPOS_WEBHOOK_TOKEN', phpposToken)
        .replaceAll('{uid}', uid);

      // Fetch all attachments from the public URL and attach as buffers (inline CIDs).
      const resolvedAttachments = await Promise.all(attachments.map(async (att) => {
        try {
          const url = `${appOrigin}/possteps/${att.filename}`;
          const resp = await fetch(url);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const buf = Buffer.from(await resp.arrayBuffer());
          const contentType = resp.headers.get('content-type') || undefined;
          return { filename: att.filename, content: buf, cid: att.cid, contentType } as any;
        } catch (err) {
          console.warn('Could not fetch attachment from', `${appOrigin}/possteps/${att.filename}`, err && (err as any).message || err);
          return null;
        }
      }));
      const finalAttachments = resolvedAttachments.filter(Boolean) as any[];

      const mailOptions: any = { from: FROM_EMAIL, to: r.email, subject, text: finalText, html: finalHtml };
      if (finalAttachments.length) mailOptions.attachments = finalAttachments;
      const info = await transporter.sendMail(mailOptions);
      console.log('PHPPOS setup email sent to', r.email, info && (info.messageId || info.response));
    } catch (err) {
      console.warn('Failed to send PHPPOS setup email to', r.email, err);
    }
  }
}

export default sendPhpposSetupEmail;

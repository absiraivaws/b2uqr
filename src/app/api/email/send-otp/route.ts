import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import nodemailer from 'nodemailer';

// Simple server-side API to generate and store a 6-digit OTP for an email.
// NOTE: This implementation logs the OTP to the server console. Replace the
// console.log with a real email send (SendGrid, SES, etc.) in production.

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email || '').toString().trim().toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ ok: false, message: 'Invalid email' }, { status: 400 });
    }

    // generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // hash the code before storing
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256').update(code).digest('hex');

    // Server-side guard: disallow sending a new OTP while an unexpired OTP
    // exists for the same email. Firestore may require a composite index for
    // certain compound queries (e.g. equality + inequality). To avoid forcing
    // an index here, query by email and do the expiry check in application code.
    const existingSnap = await adminDb.collection('email_otps').where('email', '==', email).get();
    const now = Date.now();
    const unexpiredDoc = existingSnap.docs.find(d => (d.data()?.expires_at_ms || 0) > now);
    if (unexpiredDoc) {
      const expiresAt = (unexpiredDoc.data()?.expires_at_ms || 0) as number;
      const secsLeft = Math.max(0, Math.ceil((expiresAt - now) / 1000));
      return NextResponse.json({ ok: false, message: `OTP already sent. Try again in ${secsLeft}s.`, secsLeft }, { status: 429 });
    }

    const id = `${encodeURIComponent(email)}_${Date.now()}`;
    const expiresAtMs = Date.now() + 5 * 60 * 1000; // 5 minutes

    await adminDb.collection('email_otps').doc(id).set({
      email,
      codeHash: hash,
      created_at: new Date(),
      expires_at_ms: expiresAtMs,
      attempts: 0,
    });

    // Try to send via SMTP if configured; otherwise fallback to console.log.
    const SMTP_HOST = process.env.SMTP_HOST;
    const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    const SMTP_USER = process.env.SMTP_USER;
    const SMTP_PASS = process.env.SMTP_PASS;
    const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
    const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER;

    let sendOk = false;
    let sendError: any = null;
    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          host: SMTP_HOST,
          port: SMTP_PORT || 587,
          secure: SMTP_SECURE || (SMTP_PORT === 465),
          auth: { user: SMTP_USER, pass: SMTP_PASS },
        });

        const info = await transporter.sendMail({
          from: FROM_EMAIL,
          to: email,
          subject: 'Your verification code',
          text: `Your verification code is ${code}. It expires in 5 minutes.`,
          html: `<p>Your verification code is <strong>${code}</strong>. It expires in 5 minutes.</p>`,
        });
        console.log('OTP email sent:', info && (info.messageId || info.response));
        sendOk = true;
      } catch (err: any) {
        console.error('Failed to send OTP email via SMTP:', err);
        sendError = err;
      }
    } else {
      console.warn('SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing). Falling back to console.log for OTP.');
    }

    // Fallback: always log OTP to server console so it can be inspected in dev
    console.log(`Email OTP for ${email}: ${code} (expires in 5 minutes)`);

    const secsLeft = Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000));
    // If SMTP config existed but send failed, surface an error to the client.
    if (SMTP_HOST && SMTP_USER && SMTP_PASS && !sendOk) {
      return NextResponse.json({ ok: false, message: 'Failed to send OTP email', error: String(sendError), secsLeft }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'OTP generated', secsLeft });
  } catch (err: any) {
    console.error('send-otp error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}

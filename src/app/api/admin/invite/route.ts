import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import nodemailer from 'nodemailer';
import { generateSetPasswordEmail } from '@/lib/emailTemplates';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email || '').toString().trim().toLowerCase();
    const name = (body?.name || '').toString().trim() || '';
    if (!email || !/\S+@\S+\.\S+/.test(email)) return NextResponse.json({ ok: false, message: 'Invalid email' }, { status: 400 });

    // generate a one-time token (unguessable)
    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const id = `invite_${encodeURIComponent(email)}_${Date.now()}`;
    const expiresAtMs = Date.now() + 24 * 60 * 60 * 1000; // expire in 24 hours

    await adminDb.collection('admin_invites').doc(id).set({
      email,
      name,
      tokenHash,
      created_at: new Date(),
      expires_at_ms: expiresAtMs,
      used: false,
    });

    // send email with link
    const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || `http://localhost:${process.env.PORT || 3000}`;
    const link = `${origin}/admin/set-password?token=${encodeURIComponent(token)}`;

    const SMTP_HOST = process.env.SMTP_HOST;
    const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    const SMTP_USER = process.env.SMTP_USER;
    const SMTP_PASS = process.env.SMTP_PASS;
    const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
    const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER || 'no-reply@lankaqr.local';

    let sendOk = false;
    let sendError: any = null;
    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
      try {
        const transporter = nodemailer.createTransport({ host: SMTP_HOST, port: SMTP_PORT || 587, secure: SMTP_SECURE || (SMTP_PORT === 465), auth: { user: SMTP_USER, pass: SMTP_PASS } });
        const { subject, text, html } = generateSetPasswordEmail({ name, email, link, appName: 'LankaQR' });
        const info = await transporter.sendMail({ from: FROM_EMAIL, to: email, subject, text, html });
        console.log('Invite email sent:', info && (info.messageId || info.response));
        sendOk = true;
      } catch (err: any) {
        console.error('Failed to send invite email via SMTP:', err);
        sendError = err;
      }
    } else {
      console.warn('SMTP not configured — falling back to server log for invite link');
    }

    console.log(`Admin invite for ${email}: ${link}`);

    if (SMTP_HOST && SMTP_USER && SMTP_PASS && !sendOk) {
      return NextResponse.json({ ok: false, message: 'Failed to send invite email', error: String(sendError) }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'Invite created' });
  } catch (err: any) {
    console.error('admin invite error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}

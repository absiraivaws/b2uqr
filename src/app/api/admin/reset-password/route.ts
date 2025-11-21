import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import nodemailer from 'nodemailer';
import { generateSetPasswordEmail } from '@/lib/emailTemplates';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email || '').toString().trim().toLowerCase();
    if (!email || !/\S+@\S+\.\S+/.test(email)) return NextResponse.json({ ok: false, message: 'Invalid email' }, { status: 400 });

    // Check admin exists (do not reveal existence to callers)
    const adminSnap = await adminDb.collection('admins').where('email', '==', email).limit(1).get();
    if (adminSnap.empty) {
      // Still return ok to avoid user enumeration, but log for ops
      console.warn('Password reset requested for unknown admin:', email);
    }

    // Cleanup: fetch all invites for this email and delete those that are expired or already used
    try {
      const invitesRef = adminDb.collection('admin_invites');
      const snap = await invitesRef.where('email', '==', email).get();
      const deletes: Promise<any>[] = [];
      if (!snap.empty) {
        const nowMs = Date.now();
        snap.forEach(d => {
          const data = d.data() as any;
          const isExpired = (data?.expires_at_ms || 0) < nowMs;
          const isUsed = data?.used === true;
          if (isExpired || isUsed) deletes.push(d.ref.delete());
        });
      }
      if (deletes.length) await Promise.all(deletes);
    } catch (e) {
      console.warn('Failed to cleanup expired/used invites for', email, e);
    }

    // generate a one-time token (unguessable)
    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const id = `reset_${encodeURIComponent(email)}_${Date.now()}`;
    const expiresAtMs = Date.now() + 1 * 60 * 60 * 1000; // expire in 1 hour

    await adminDb.collection('admin_invites').doc(id).set({
      email,
      tokenHash,
      purpose: 'reset',
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
        const { subject, text, html } = generateSetPasswordEmail({ name: '', email, link, appName: 'LankaQR' });
        const info = await transporter.sendMail({ from: FROM_EMAIL, to: email, subject, text, html });
        console.log('Reset email sent:', info && (info.messageId || info.response));
        sendOk = true;
      } catch (err: any) {
        console.error('Failed to send reset email via SMTP:', err);
        sendError = err;
      }
    } else {
      console.warn('SMTP not configured — falling back to server log for reset link');
    }

    console.log(`Admin password reset for ${email}: ${link}`);

    if (SMTP_HOST && SMTP_USER && SMTP_PASS && !sendOk) {
      return NextResponse.json({ ok: false, message: 'Failed to send reset email', error: String(sendError) }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'Reset initiated' });
  } catch (err: any) {
    console.error('admin reset-password error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}

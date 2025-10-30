import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

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

  // Placeholder: log OTP for now. Replace with real email sending.
  console.log(`Email OTP for ${email}: ${code} (expires in 5 minutes)`);

  const secsLeft = Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000));
  return NextResponse.json({ ok: true, message: 'OTP generated', secsLeft });
  } catch (err: any) {
    console.error('send-otp error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}

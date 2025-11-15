import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';

// Verify email OTP: expects { email, code, fullName? }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email || '').toString().trim().toLowerCase();
    const code = (body?.code || '').toString().trim();
    const fullName = (body?.fullName || '').toString().trim() || undefined;
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ ok: false, message: 'Invalid email' }, { status: 400 });
    }
    if (!/^[0-9]{4,6}$/.test(code)) {
      return NextResponse.json({ ok: false, message: 'Invalid code' }, { status: 400 });
    }

    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256').update(code).digest('hex');

    // find matching, unexpired OTP for this email
    const col = adminDb.collection('email_otps');
    const q = col.where('email', '==', email);
    const snap = await q.get();
    const now = Date.now();
    let matchedDocId: string | null = null;
    snap.forEach(d => {
      const data: any = d.data();
      if (!data) return;
      const expires = Number(data.expires_at_ms || 0);
      if (expires < now) return;
      if (data.codeHash === hash) {
        matchedDocId = d.id;
      }
    });

    if (!matchedDocId) {
      return NextResponse.json({ ok: false, message: 'OTP not found or expired' }, { status: 400 });
    }

    // create the Firebase Auth user server-side
    try {
      const created = await adminAuth.createUser({
        email,
        emailVerified: true,
        displayName: fullName,
      });

      // consume the OTP
      await adminDb.collection('email_otps').doc(matchedDocId).delete();

      const customToken = await adminAuth.createCustomToken(created.uid);
      return NextResponse.json({ ok: true, uid: created.uid, email: created.email, displayName: created.displayName, customToken });
    } catch (authErr: any) {
      console.error('admin.createUser failed', authErr);
      // If email already exists, inform client to sign in instead
      if (authErr?.code === 'auth/email-already-exists' || authErr?.code === 'auth/email-already-in-use') {
        return NextResponse.json({ ok: false, message: 'Email already in use. Please sign in instead.' }, { status: 400 });
      }
      return NextResponse.json({ ok: false, message: authErr?.message || 'Failed to create auth user' }, { status: 500 });
    }
  } catch (err: any) {
    console.error('verify-otp error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}

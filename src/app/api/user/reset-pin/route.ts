import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { hashPin } from '@/lib/pinHash';

// Reset PIN for an existing user by verifying an email OTP
// Body: { email: string, code: string, newPin: string }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email || '').toString().trim().toLowerCase();
    const code = (body?.code || '').toString().trim();
    const newPin = (body?.newPin || '').toString().trim();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ ok: false, message: 'Invalid email' }, { status: 400 });
    }
    if (!/^[0-9]{4,6}$/.test(code)) {
      return NextResponse.json({ ok: false, message: 'Invalid code' }, { status: 400 });
    }
    if (!/^[0-9]{4,6}$/.test(newPin)) {
      return NextResponse.json({ ok: false, message: 'Invalid PIN format' }, { status: 400 });
    }

    // Find matching, unexpired OTP for this email
    const crypto = await import('crypto');
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const col = adminDb.collection('email_otps');
    const snap = await col.where('email', '==', email).get();
    const now = Date.now();
    let matchedId: string | null = null;
    snap.forEach(d => {
      const data: any = d.data();
      if (!data) return;
      if (Number(data.expires_at_ms || 0) < now) return;
      if (data.codeHash === codeHash) matchedId = d.id;
    });
    if (!matchedId) {
      return NextResponse.json({ ok: false, message: 'OTP not found or expired' }, { status: 400 });
    }

    // Ensure user exists in Firebase Auth
    let uid: string;
    try {
      const authUser = await adminAuth.getUserByEmail(email);
      uid = authUser.uid;
    } catch (err: any) {
      return NextResponse.json({ ok: false, message: 'No account found for this email' }, { status: 404 });
    }

    // Hash and store the new PIN
    const newHash = await hashPin(newPin);
    const userRef = adminDb.collection('users').doc(uid);
    await userRef.set(
      {
        uid,
        email,
        pinHash: newHash,
        pinHashAlgo: 'argon2',
        pinHashUpdatedAt: new Date(),
        updated_at: new Date(),
      },
      { merge: true }
    );

    // Consume OTP
    await col.doc(matchedId).delete();

    // Optionally return a custom token so client can sign in immediately
    let customToken: string | null = null;
    try {
      customToken = await adminAuth.createCustomToken(uid);
    } catch (e) {
      // Non-fatal if token creation fails
      customToken = null;
    }

    return NextResponse.json({ ok: true, uid, customToken });
  } catch (err: any) {
    console.error('reset-pin error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}

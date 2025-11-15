import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

// Lightweight endpoint to verify an email OTP exists and is unexpired.
// Does NOT create users or consume the OTP. Intended for gating UI flows (e.g., reset PIN).
// Body: { email: string, code: string }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email || '').toString().trim().toLowerCase();
    const code = (body?.code || '').toString().trim();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ ok: false, message: 'Invalid email' }, { status: 400 });
    }
    if (!/^[0-9]{4,6}$/.test(code)) {
      return NextResponse.json({ ok: false, message: 'Invalid code' }, { status: 400 });
    }

    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256').update(code).digest('hex');

    const col = adminDb.collection('email_otps');
    const snap = await col.where('email', '==', email).get();
    const now = Date.now();
    let valid = false;
    let secsLeft: number | null = null;
    snap.forEach(d => {
      const data: any = d.data();
      if (!data) return;
      const expiresAt = Number(data.expires_at_ms || 0);
      if (expiresAt < now) return;
      if (data.codeHash === hash) {
        valid = true;
        secsLeft = Math.max(0, Math.ceil((expiresAt - now) / 1000));
      }
    });

    if (!valid) {
      return NextResponse.json({ ok: false, message: 'OTP not found or expired' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, secsLeft });
  } catch (err: any) {
    console.error('check-otp error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}

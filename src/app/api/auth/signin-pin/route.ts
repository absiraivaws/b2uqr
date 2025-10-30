import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const identifier = (body?.identifier || '').toString().trim();
    const pin = (body?.pin || '').toString().trim();
    if (!identifier || !pin) return NextResponse.json({ ok: false, message: 'Missing identifier or pin' }, { status: 400 });

    // find user doc by email or phone
    let userDocSnap = null;
    const byEmail = await adminDb.collection('users').where('email', '==', identifier).limit(1).get();
    if (!byEmail.empty) userDocSnap = byEmail.docs[0];
    else {
      const byPhone = await adminDb.collection('users').where('phone', '==', identifier).limit(1).get();
      if (!byPhone.empty) userDocSnap = byPhone.docs[0];
    }

    if (!userDocSnap) return NextResponse.json({ ok: false, message: 'User not found' }, { status: 404 });

    const data: any = userDocSnap.data();
    const storedHash = data?.pinHash;
    if (!storedHash) return NextResponse.json({ ok: false, message: 'PIN not set' }, { status: 400 });

    // hash incoming pin and compare
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256').update(pin).digest('hex');
    if (hash !== storedHash) return NextResponse.json({ ok: false, message: 'Invalid PIN' }, { status: 401 });

    const uid = data.uid;
    if (!uid) return NextResponse.json({ ok: false, message: 'No uid associated' }, { status: 500 });

    // create custom token
    const customToken = await adminAuth.createCustomToken(uid);
    return NextResponse.json({ ok: true, customToken, uid });
  } catch (err: any) {
    console.error('signin-pin error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}

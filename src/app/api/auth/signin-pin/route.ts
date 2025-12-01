import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { verifyPin, hashPin, isArgonHash } from '@/lib/pinHash';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const identifier = (body?.identifier || '').toString().trim();
    const normalizedIdentifier = identifier.toLowerCase();
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

    if (!userDocSnap) {
      const usernameLookup = await adminDb.collection('users').where('username', '==', normalizedIdentifier).limit(1).get();
      if (!usernameLookup.empty) userDocSnap = usernameLookup.docs[0];
    }

    if (!userDocSnap) return NextResponse.json({ ok: false, message: 'User not found' }, { status: 404 });

    const data: any = userDocSnap.data();
    if (data?.status === 'disabled') {
      return NextResponse.json({ ok: false, message: 'Account disabled' }, { status: 403 });
    }
    const storedHash = data?.pinHash;
    if (!storedHash) return NextResponse.json({ ok: false, message: 'PIN not set' }, { status: 400 });

    let valid = false;
    // If stored hash looks like an Argon2 hash, verify using argon2
    if (isArgonHash(storedHash)) {
      valid = await verifyPin(pin, storedHash);
    } else {
      // legacy SHA-256 stored PINs: verify then upgrade to Argon2 on success
      const crypto = await import('crypto');
      const legacyHash = crypto.createHash('sha256').update(pin).digest('hex');
      if (legacyHash === storedHash) {
        valid = true;
        try {
          const newHash = await hashPin(pin);
          // update user doc to store new Argon2 hash and metadata
          await adminDb.collection('users').doc(userDocSnap.id).update({
            pinHash: newHash,
            pinHashAlgo: 'argon2',
            pinHashUpdatedAt: new Date(),
          });
        } catch (err) {
          console.warn('Failed to upgrade legacy pin hash', err);
        }
      }
    }

    if (!valid) return NextResponse.json({ ok: false, message: 'Invalid PIN' }, { status: 401 });

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

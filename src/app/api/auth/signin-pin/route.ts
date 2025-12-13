import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { verifyPin, hashPin, isArgonHash } from '@/lib/pinHash';
import { buildCorsHeaders, buildPreflightHeaders } from '@/lib/cors';

export function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: buildPreflightHeaders(req) });
}

export async function POST(req: Request) {
  try {
    const origin = req.headers.get('origin');
    const corsHeaders = buildCorsHeaders(origin);
    const respond = (body: any, status = 200) => NextResponse.json(body, { status, headers: corsHeaders });

    const body = await req.json();
    const identifier = (body?.identifier || '').toString().trim();
    const normalizedIdentifier = identifier.toLowerCase();
    const pin = (body?.pin || '').toString().trim();
    if (!identifier || !pin) return respond({ ok: false, message: 'Missing identifier or pin' }, 400);

    // find user doc by email (case-insensitive try), then phone, then username
    let userDocSnap = null;
    // try exact email match first
    const byEmail = await adminDb.collection('users').where('email', '==', identifier).limit(1).get();
    if (!byEmail.empty) {
      userDocSnap = byEmail.docs[0];
    } else {
      // try lowercased email (some stored emails may be lowercased)
      if (normalizedIdentifier !== identifier) {
        const byEmailLower = await adminDb.collection('users').where('email', '==', normalizedIdentifier).limit(1).get();
        if (!byEmailLower.empty) userDocSnap = byEmailLower.docs[0];
      }
      // fallback to phone
      if (!userDocSnap) {
        const byPhone = await adminDb.collection('users').where('phone', '==', identifier).limit(1).get();
        if (!byPhone.empty) userDocSnap = byPhone.docs[0];
      }
    }

    // fallback: username lookup using normalized identifier
    if (!userDocSnap) {
      const usernameLookup = await adminDb.collection('users').where('username', '==', normalizedIdentifier).limit(1).get();
      if (!usernameLookup.empty) userDocSnap = usernameLookup.docs[0];
    }

    if (!userDocSnap) return respond({ ok: false, message: 'User not found' }, 404);

    const data: any = userDocSnap.data();
    if (data?.status === 'disabled') {
      return respond({ ok: false, message: 'Account disabled' }, 403);
    }
    const storedHash = data?.pinHash;
    if (!storedHash) return respond({ ok: false, message: 'PIN not set' }, 400);

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

    if (!valid) return respond({ ok: false, message: 'Invalid PIN' }, 401);

    const uid = data.uid;
    if (!uid) return respond({ ok: false, message: 'No uid associated' }, 500);

    // create custom token
    const customToken = await adminAuth.createCustomToken(uid);
    return respond({ ok: true, customToken, uid });
  } catch (err: any) {
    console.error('signin-pin error', err);
    const origin = req.headers.get('origin');
    const corsHeaders = buildCorsHeaders(origin);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500, headers: corsHeaders });
  }
}

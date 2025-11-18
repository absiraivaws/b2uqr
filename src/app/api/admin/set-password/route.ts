import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { hashPin } from '@/lib/pinHash';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = (body?.token || '').toString();
    const password = (body?.password || '').toString();
    if (!token || token.length < 8) return NextResponse.json({ ok: false, message: 'Missing token' }, { status: 400 });
    if (!password || password.length < 8) return NextResponse.json({ ok: false, message: 'Password must be at least 8 characters' }, { status: 400 });

    const crypto = await import('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // find invite by tokenHash
    const invitesSnap = await adminDb.collection('admin_invites').where('tokenHash', '==', tokenHash).limit(1).get();
    if (invitesSnap.empty) return NextResponse.json({ ok: false, message: 'Invalid or expired token' }, { status: 404 });
    const inviteDoc = invitesSnap.docs[0];
    const invite = inviteDoc.data();
    const now = Date.now();
    if ((invite?.used) === true) return NextResponse.json({ ok: false, message: 'Token already used' }, { status: 400 });
    if ((invite?.expires_at_ms || 0) < now) return NextResponse.json({ ok: false, message: 'Token expired' }, { status: 400 });

    const email = (invite.email || '').toString().trim().toLowerCase();
    if (!email) return NextResponse.json({ ok: false, message: 'Invite missing email' }, { status: 500 });

    // find admin doc
    const adminSnap = await adminDb.collection('admins').where('email', '==', email).limit(1).get();
    if (adminSnap.empty) return NextResponse.json({ ok: false, message: 'Admin account not found' }, { status: 404 });
    const adminRef = adminSnap.docs[0].ref;

    // hash password with Argon2 via hashPin util (adds server pepper)
    const passwordHash = await hashPin(password);

    await adminRef.update({
      passwordHash,
      passwordHashAlgo: 'argon2',
      passwordSetAt: new Date(),
    });

    // mark invite used
    await inviteDoc.ref.update({ used: true, used_at: new Date() });

    return NextResponse.json({ ok: true, message: 'Password set' });
  } catch (err: any) {
    console.error('set-password error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}

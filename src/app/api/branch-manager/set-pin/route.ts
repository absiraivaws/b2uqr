import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { hashPin } from '@/lib/pinHash';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = (body?.token || '').toString().trim();
    const pin = (body?.pin || '').toString().trim();
    if (!token || token.length < 8) return NextResponse.json({ ok: false, message: 'Missing token' }, { status: 400 });
    if (!/^[0-9]{4,6}$/.test(pin)) return NextResponse.json({ ok: false, message: 'Invalid PIN format' }, { status: 400 });

    const crypto = await import('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const invitesCol = adminDb.collection('branch_manager_invites');
    const snap = await invitesCol.where('tokenHash', '==', tokenHash).limit(1).get();
    if (snap.empty) return NextResponse.json({ ok: false, message: 'Invalid or expired token' }, { status: 404 });

    const inviteDoc = snap.docs[0];
    const invite = inviteDoc.data() as any;
    const now = Date.now();
    if ((invite?.used) === true) return NextResponse.json({ ok: false, message: 'Token already used' }, { status: 400 });
    if ((invite?.expires_at_ms || 0) < now) {
      try { await inviteDoc.ref.delete(); } catch (e) { console.warn('failed to delete expired branch invite', e); }
      return NextResponse.json({ ok: false, message: 'Token expired' }, { status: 400 });
    }

    const email = (invite.email || '').toString().trim().toLowerCase();
    if (!email) return NextResponse.json({ ok: false, message: 'Invite missing email' }, { status: 500 });

    // Find the user doc for this manager
    const usersSnap = await adminDb.collection('users').where('email', '==', email).where('role', '==', 'branch-manager').limit(1).get();
    if (usersSnap.empty) return NextResponse.json({ ok: false, message: 'Manager account not found' }, { status: 404 });
    const userDoc = usersSnap.docs[0];
    const uid = userDoc.id;

    // Hash the PIN and update user doc
    const pinHash = await hashPin(pin);

    await userDoc.ref.set({
      pinHash,
      pinHashAlgo: 'argon2',
      pinHashUpdatedAt: new Date(),
      status: 'active',
      updated_at: new Date(),
    }, { merge: true });

    // mark invite used
    await inviteDoc.ref.update({ used: true, used_at: new Date() });

    // enable auth user if exists
    try {
      const authUser = await adminAuth.getUser(uid).catch(() => null);
      if (authUser) {
        await adminAuth.updateUser(uid, { disabled: false }).catch(() => null);
        await adminAuth.revokeRefreshTokens(uid).catch(() => null);
      }
    } catch (e) {
      console.warn('failed to enable auth user after set-pin', e);
    }

    return NextResponse.json({ ok: true, message: 'PIN set' });
  } catch (err: any) {
    console.error('branch-manager set-pin error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}

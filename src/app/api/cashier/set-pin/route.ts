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

    const invitesCol = adminDb.collection('cashier_invites');
    const snap = await invitesCol.where('tokenHash', '==', tokenHash).limit(1).get();
    if (snap.empty) return NextResponse.json({ ok: false, message: 'Invalid or expired token' }, { status: 404 });

    const inviteDoc = snap.docs[0];
    const invite = inviteDoc.data() as any;
    const now = Date.now();
    if ((invite?.used) === true) return NextResponse.json({ ok: false, message: 'Token already used' }, { status: 400 });
    if ((invite?.expires_at_ms || 0) < now) {
      try { await inviteDoc.ref.delete(); } catch (e) { console.warn('failed to delete expired cashier invite', e); }
      return NextResponse.json({ ok: false, message: 'Token expired' }, { status: 400 });
    }

    const cashierUid = invite.cashierUid as string | undefined;
    const email = (invite.email || '').toString().trim().toLowerCase();
    if (!cashierUid && !email) return NextResponse.json({ ok: false, message: 'Invite missing target' }, { status: 500 });

    // Hash the PIN and update user doc
    const pinHash = await hashPin(pin);

    let userRef = null;
    if (cashierUid) {
      userRef = adminDb.collection('users').doc(cashierUid);
    } else {
      const usersSnap = await adminDb.collection('users').where('email', '==', email).where('role', '==', 'cashier').limit(1).get();
      if (usersSnap.empty) return NextResponse.json({ ok: false, message: 'Cashier account not found' }, { status: 404 });
      userRef = usersSnap.docs[0].ref;
    }

    await userRef!.set({
      pinHash,
      pinHashAlgo: 'argon2',
      pinHashUpdatedAt: new Date(),
      status: 'active',
      updated_at: new Date(),
    }, { merge: true });

    // Mark cashier doc active if present. Prefer direct path update using invite metadata
    // or `users/{uid}` data to locate the cashier doc. Avoid broad collectionGroup queries
    // which may fail in some environments (observed FAILED_PRECONDITION errors).
    try {
      let updated = false;
      const inviteCompanyId = invite.companyId as string | undefined;
      const inviteBranchId = invite.branchId as string | undefined;
      const inviteCashierUid = invite.cashierUid as string | undefined;

      // 0) direct path update using invite metadata
      if (inviteCompanyId && inviteBranchId && inviteCashierUid) {
        try {
          const directRef = adminDb.collection('companies').doc(inviteCompanyId)
            .collection('branches').doc(inviteBranchId)
            .collection('cashiers').doc(inviteCashierUid);
          const dSnap = await directRef.get();
          if (dSnap.exists) {
            await directRef.update({ status: 'active', updated_at: new Date() });
            updated = true;
            console.log('cashier set-pin: updated cashier doc via direct path', directRef.path);
          }
        } catch (e) {
          console.warn('cashier set-pin: direct update failed', e);
        }
      }

      // 1) fallback: derive branch/company from users doc and update direct path
      if (!updated) {
        try {
          const uSnap = await adminDb.collection('users').doc(userRef!.id).get();
          if (uSnap.exists) {
            const udata = uSnap.data() as any;
            const uCompany = udata?.companyId as string | undefined;
            const uBranch = udata?.branchId as string | undefined;
            const uCashierId = userRef!.id;
            if (uCompany && uBranch) {
              const directRef = adminDb.collection('companies').doc(uCompany)
                .collection('branches').doc(uBranch)
                .collection('cashiers').doc(uCashierId);
              const dSnap = await directRef.get();
              if (dSnap.exists) {
                await directRef.update({ status: 'active', updated_at: new Date() });
                updated = true;
                console.log('cashier set-pin: updated cashier doc via users doc derived path', directRef.path);
              }
            }
          }
        } catch (e) {
          console.warn('cashier set-pin: users-doc-derived update failed', e);
        }
      }

      if (!updated) {
        console.warn('cashier set-pin: cashier document not found for uid', userRef!.id, 'invite:', { email: invite.email, cashierUid: invite.cashierUid, companyId: invite.companyId, branchId: invite.branchId });
      }
    } catch (e) {
      console.warn('cashier set-pin: failed to update cashier doc status', e);
    }

    // mark invite used
    await inviteDoc.ref.update({ used: true, used_at: new Date() });

    // enable auth user if exists
    try {
      const authUser = await adminAuth.getUser(userRef!.id).catch(() => null);
      if (authUser) {
        await adminAuth.updateUser(userRef!.id, { disabled: false }).catch(() => null);
        await adminAuth.revokeRefreshTokens(userRef!.id).catch(() => null);
      }
    } catch (e) {
      console.warn('failed to enable auth user after cashier set-pin', e);
    }

    return NextResponse.json({ ok: true, message: 'PIN set' });
  } catch (err: any) {
    console.error('cashier set-pin error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}

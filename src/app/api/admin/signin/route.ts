import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { verifyPin } from '@/lib/pinHash';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email || '').toString().trim().toLowerCase();
    const password = (body?.password || '').toString();
    if (!email || !password) return NextResponse.json({ ok: false, message: 'Missing credentials' }, { status: 400 });

    const adminSnap = await adminDb.collection('admins').where('email', '==', email).limit(1).get();
    if (adminSnap.empty) return NextResponse.json({ ok: false, message: 'Invalid email or password' }, { status: 401 });
    const adminDoc = adminSnap.docs[0];
    const admin = adminDoc.data();

    const stored = (admin?.passwordHash || '').toString();
    if (!stored) return NextResponse.json({ ok: false, message: 'No password set for this account' }, { status: 401 });

    const ok = await verifyPin(password, stored);
    if (!ok) return NextResponse.json({ ok: false, message: 'Invalid email or password' }, { status: 401 });

    // remove any existing sessions for this admin to keep a single active session
    try {
      const existing = await adminDb.collection('admin_sessions').where('adminId', '==', adminDoc.id).get();
      const deletes: Promise<any>[] = [];
      existing.forEach((d) => deletes.push(d.ref.delete()));
      if (deletes.length) await Promise.all(deletes);
    } catch (e) {
      // best-effort cleanup, ignore errors
      console.warn('failed to cleanup existing admin sessions', e);
    }

    // create a server session id
    const crypto = await import('crypto');
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresInMs = 8 * 60 * 60 * 1000; // 8 hours

    await adminDb.collection('admin_sessions').doc(sessionId).set({ adminId: adminDoc.id, created_at: new Date(), expires_at_ms: Date.now() + expiresInMs });

    const cookieOptions = [`admin_session=${sessionId}`, `Max-Age=${Math.floor(expiresInMs / 1000)}`, `HttpOnly`, `Path=/`, `SameSite=Lax`];
    if (process.env.NODE_ENV === 'production') cookieOptions.push('Secure');

    return NextResponse.json({ ok: true }, { headers: { 'Set-Cookie': cookieOptions.join('; ') } });
  } catch (err: any) {
    console.error('admin signin error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}

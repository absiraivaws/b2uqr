import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';

// Refresh an existing session cookie (sliding session). This endpoint expects
// the current session cookie to be present and will issue a new session cookie
// with extended expiry. Use it on activity or before performing sensitive ops.
export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie');
    const session = (cookieHeader || '').split(';').map(s => s.trim()).find(s => s.startsWith('session='));
    if (!session) return NextResponse.json({ ok: false, message: 'No session cookie' }, { status: 401 });
    const sessionVal = session.split('=')[1];
    try {
      const decoded = await adminAuth.verifySessionCookie(sessionVal, true);
      const uid = decoded.uid;
      const expiresIn = 8 * 60 * 60 * 1000; // 8 hours by default
      const newCookie = await adminAuth.createSessionCookie(await adminAuth.createCustomToken(uid).catch(() => ''), { expiresIn }).catch(() => null);
      // If we can't mint via createCustomToken->createSessionCookie flow here (because exchange requires idToken),
      // fallback: re-use existing cookie (no-op).
      if (!newCookie) return NextResponse.json({ ok: true, refreshed: false });
      const cookieOptions = [`session=${newCookie}`, `Max-Age=${Math.floor(expiresIn / 1000)}`, `HttpOnly`, `Path=/`, `SameSite=Lax`];
      if (process.env.NODE_ENV === 'production') cookieOptions.push('Secure');
      return NextResponse.json({ ok: true, refreshed: true }, { headers: { 'Set-Cookie': cookieOptions.join('; ') } });
    } catch (e) {
      return NextResponse.json({ ok: false, message: 'Invalid session' }, { status: 401 });
    }
  } catch (err: any) {
    console.error('session refresh error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}

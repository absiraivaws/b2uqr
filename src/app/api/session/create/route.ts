import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';

// Create a secure session cookie from a client ID token
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const idToken = body?.idToken;
    if (!idToken) return NextResponse.json({ ok: false, message: 'Missing idToken' }, { status: 400 });

    // expiresIn must be <= 14 days in ms
    const expiresIn = typeof body.expiresIn === 'number' ? body.expiresIn : 8 * 60 * 60 * 1000; // default 8 hours
    const maxCookieAge = Math.min(expiresIn, 14 * 24 * 60 * 60 * 1000);

    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: maxCookieAge });

    const cookieOptions = [`session=${sessionCookie}`, `Max-Age=${Math.floor(maxCookieAge / 1000)}`, `HttpOnly`, `Path=/`, `SameSite=Lax`];
    if (process.env.NODE_ENV === 'production') cookieOptions.push('Secure');

    return NextResponse.json({ ok: true }, { headers: { 'Set-Cookie': cookieOptions.join('; ') } });
  } catch (err: any) {
    console.error('session create error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}

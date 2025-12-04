import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { buildCorsHeaders, buildPreflightHeaders } from '@/lib/cors';

const FIREBASE_REST_API_KEY = process.env.FIREBASE_REST_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

async function exchangeCustomTokenForIdToken(customToken: string) {
  if (!FIREBASE_REST_API_KEY) throw new Error('Missing Firebase API key to exchange custom token.');
  const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_REST_API_KEY}`;
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data?.idToken) {
    const message = data?.error?.message || 'Failed to exchange custom token';
    throw new Error(message);
  }
  return data.idToken as string;
}

function shouldAttemptExchange(err: any) {
  if (!FIREBASE_REST_API_KEY) return false;
  const code = err?.errorInfo?.code || err?.code || '';
  const message = err?.message || '';
  return code === 'auth/argument-error' || code === 'auth/invalid-id-token' || /ID token/i.test(message);
}

export function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: buildPreflightHeaders(req) });
}

// Create a secure session cookie from a client ID token
export async function POST(req: Request) {
  try {
    const origin = req.headers.get('origin');
    const corsHeaders = buildCorsHeaders(origin);
    const respond = (body: any, status = 200) => {
      const response = NextResponse.json(body, { status });
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value));
      return response;
    };

    const body = await req.json();
    const idToken = body?.idToken;
    if (!idToken) return respond({ ok: false, message: 'Missing idToken' }, 400);

    // expiresIn must be <= 14 days in ms
    const expiresIn = typeof body.expiresIn === 'number' ? body.expiresIn : 8 * 60 * 60 * 1000; // default 8 hours
    const maxCookieAge = Math.min(expiresIn, 14 * 24 * 60 * 60 * 1000);
    let sessionCookie: string;
    try {
      sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: maxCookieAge });
    } catch (err) {
      if (!shouldAttemptExchange(err)) throw err;
      const exchangedIdToken = await exchangeCustomTokenForIdToken(idToken);
      sessionCookie = await adminAuth.createSessionCookie(exchangedIdToken, { expiresIn: maxCookieAge });
    }

    const sameSite = process.env.NODE_ENV === 'production' ? 'None' : 'Lax';
    const cookieOptions = [`session=${sessionCookie}`, `Max-Age=${Math.floor(maxCookieAge / 1000)}`, `HttpOnly`, `Path=/`, `SameSite=${sameSite}`];
    if (process.env.NODE_ENV === 'production') cookieOptions.push('Secure');

    const response = respond({ ok: true });
    response.headers.append('Set-Cookie', cookieOptions.join('; '));
    return response;
  } catch (err: any) {
    console.error('session create error', err);
    const origin = req.headers.get('origin');
    const corsHeaders = buildCorsHeaders(origin);
    const response = NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  }
}

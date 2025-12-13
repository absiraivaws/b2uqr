import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';

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

export async function POST(req: Request) {
  try {
    // support JSON or form-encoded bodies
    let body: any = {};
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await req.json().catch(() => ({}));
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await req.text().catch(() => '');
      const params = new URLSearchParams(text || '');
      body = Object.fromEntries(params.entries());
    } else {
      // try JSON parse as a last resort
      body = await req.json().catch(() => ({}));
    }

    const customToken = (body?.customToken || '').toString();
    const redirectTo = (body?.redirectTo || '/').toString();
    if (!customToken) return NextResponse.json({ ok: false, message: 'Missing customToken' }, { status: 400 });

    // Exchange to idToken
    let idToken: string;
    try {
      idToken = await exchangeCustomTokenForIdToken(customToken);
    } catch (err: any) {
      console.error('landing: token exchange failed', err);
      return NextResponse.json({ ok: false, message: err?.message || 'Token exchange failed' }, { status: 500 });
    }

    // create session cookie
    const expiresIn = 8 * 60 * 60 * 1000; // 8 hours
    const maxCookieAge = Math.min(expiresIn, 14 * 24 * 60 * 60 * 1000);
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: maxCookieAge });

    const sameSite = process.env.NODE_ENV === 'production' ? 'None' : 'Lax';
    const cookieOptions = [`session=${sessionCookie}`, `Max-Age=${Math.floor(maxCookieAge / 1000)}`, `HttpOnly`, `Path=/`, `SameSite=${sameSite}`];
    if (process.env.NODE_ENV === 'production') cookieOptions.push('Secure');

    // Return a small HTML page that sets the cookie and performs a client-side redirect.
    // This avoids a server-side redirect which can cause Server Actions origin checks
    // on the subsequent GET (when requests are forwarded through a proxy).
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1" /><title>Signing in…</title></head><body><script>try{window.location.replace(${JSON.stringify(redirectTo)});}catch(e){window.location.href=${JSON.stringify(redirectTo)};}</script><noscript><a href="${redirectTo}">Continue</a></noscript></body></html>`;
    const response = new NextResponse(html, { status: 200 });
    response.headers.set('Content-Type', 'text/html; charset=utf-8');
    response.headers.append('Set-Cookie', cookieOptions.join('; '));
    return response;
  } catch (err: any) {
    console.error('session landing error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}

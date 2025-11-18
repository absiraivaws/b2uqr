import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

function parseCookies(cookieHeader?: string | null) {
  const map: Record<string, string> = {};
  if (!cookieHeader) return map;
  const parts = cookieHeader.split(';');
  for (const p of parts) {
    const [k, ...rest] = p.split('=');
    if (!k) continue;
    map[k.trim()] = decodeURIComponent((rest || []).join('=').trim());
  }
  return map;
}

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie');
    const cookies = parseCookies(cookieHeader);
    const sessionId = cookies['admin_session'];
    if (sessionId) {
      try {
        await adminDb.collection('admin_sessions').doc(sessionId).delete();
      } catch (e) {
        // ignore errors deleting session
        console.warn('Failed to delete admin session doc', e);
      }
    }

    const cookieOptions = [`admin_session=`, `Max-Age=0`, `HttpOnly`, `Path=/`, `SameSite=Lax`];
    if (process.env.NODE_ENV === 'production') cookieOptions.push('Secure');

    return NextResponse.json({ ok: true }, { headers: { 'Set-Cookie': cookieOptions.join('; ') } });
  } catch (err: any) {
    console.error('admin signout error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}

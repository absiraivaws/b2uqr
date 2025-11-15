import { NextResponse } from 'next/server';
import { verifySessionCookieFromRequest } from '@/lib/sessionAdmin';

export async function GET(req: Request) {
  try {
    const decoded = await verifySessionCookieFromRequest(req);
    if (!decoded) return NextResponse.json({ ok: false, message: 'No valid session' }, { status: 401 });
    // return minimal user info
    return NextResponse.json({ ok: true, uid: decoded.uid, email: decoded.email, name: decoded.name });
  } catch (err: any) {
    console.error('session verify error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}

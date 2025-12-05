import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { verifySessionCookieFromRequest } from '@/lib/sessionAdmin';
import { buildCorsHeaders, buildPreflightHeaders } from '@/lib/cors';

export function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: buildPreflightHeaders(req, ['GET', 'OPTIONS']) });
}

export async function GET(req: Request) {
  try {
    const origin = req.headers.get('origin');
    const corsHeaders = buildCorsHeaders(origin);
    const respond = (body: any, status = 200) => NextResponse.json(body, { status, headers: corsHeaders });

    const decoded = await verifySessionCookieFromRequest(req);
    if (!decoded) return respond({ ok: false, message: 'No valid session' }, 401);

    const customToken = await adminAuth.createCustomToken(decoded.uid);
    return respond({ ok: true, customToken, uid: decoded.uid });
  } catch (err: any) {
    console.error('custom-token route error', err);
    const origin = req.headers.get('origin');
    const corsHeaders = buildCorsHeaders(origin);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500, headers: corsHeaders });
  }
}

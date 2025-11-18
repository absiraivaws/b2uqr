import { NextResponse } from 'next/server';
import { getAdminByCookieHeader } from './adminSession';

/**
 * Small helper for API routes to obtain the admin from the incoming request.
 *
 * Usage in an API route handler:
 * const admin = await getAdminFromRequest(req);
 * if (!admin) return NextResponse.json({ ok: false }, { status: 401 });
 */
export async function getAdminFromRequest(req: Request) {
  const cookieHeader = req.headers.get('cookie');
  return getAdminByCookieHeader(cookieHeader);
}

/**
 * Convenience helper that returns a NextResponse 401 when unauthenticated.
 * Use this when you want a one-line guard in an API route and will return its result.
 *
 * Example:
 * const maybe = await requireAdminFromRequest(req);
 * if (maybe instanceof NextResponse) return maybe; // unauthorized
 * const admin = maybe; // authenticated admin object
 */
export async function requireAdminFromRequest(req: Request) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
  }
  return admin;
}

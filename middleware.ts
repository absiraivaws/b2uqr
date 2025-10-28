import { NextResponse, NextRequest } from 'next/server';

// Only these top-level routes (and their subpaths) are protected
const PROTECTED_PREFIXES = ['/generate-qr', '/transactions', '/summary', '/profile', '/settings'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow next internals, public files, and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api')
  ) {
    return NextResponse.next();
  }

  // If request matches a protected route, require a session cookie
  const isProtected = PROTECTED_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!isProtected) return NextResponse.next();

  // Check common cookie names set by client after sign-in.
  const cookies = req.cookies;
  const sessionCookie = cookies.get('user_uid')?.value || cookies.get('token')?.value || cookies.get('__session')?.value;

  if (!sessionCookie) {
    const signInUrl = req.nextUrl.clone();
    signInUrl.pathname = '/signin';
    signInUrl.search = `?from=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

// Run middleware only for these routes
export const config = {
  matcher: ['/generate-qr/:path*', '/transactions/:path*', '/summary/:path*', '/profile/:path*', '/settings/:path*'],
};
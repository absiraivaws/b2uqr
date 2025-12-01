import { NextResponse, NextRequest } from 'next/server';

// Always enforce auth for these static routes
const PROTECTED_PREFIXES = ['/generate-qr', '/transactions', '/summary', '/profile', '/settings'];
const PUBLIC_ROOT_SEGMENTS = new Set([
  '',
  'signin',
  'signup',
  'reset-pin',
  'docs',
  'public',
  'manifest.json',
  'sw.js',
  'workbox-4754cb34.js',
  'icons',
]);

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
  const isStaticProtected = PROTECTED_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
  let isSlugProtected = false;
  if (!isStaticProtected) {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length) {
      const first = segments[0];
      if (!PUBLIC_ROOT_SEGMENTS.has(first) && !first.startsWith('_next') && first !== 'api') {
        isSlugProtected = true;
      }
    }
  }
  const isProtected = isStaticProtected || isSlugProtected;
  if (!isProtected) return NextResponse.next();

  // Check for our server-side session cookie created at /api/session/create
  // Note: middleware runs at the edge runtime and cannot verify the cookie's
  // signature here (firebase-admin is Node-only). We only check presence and
  // rely on server-side helpers to fully validate the cookie in SSR handlers.
  const cookies = req.cookies;
  const sessionCookie = cookies.get('session')?.value;

  if (!sessionCookie) {
    const signInUrl = req.nextUrl.clone();
    signInUrl.pathname = '/signin';
    signInUrl.search = `?from=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(signInUrl);
  }

  // For protected pages, instruct browsers and intermediate caches not to store
  // a cached copy so the back-button cannot show stale authenticated content.
  const res = NextResponse.next();
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('Expires', '0');
  return res;
}

// Run middleware only for these routes
export const config = {
  matcher: ['/((?!_next/|api/|favicon\.ico|robots\.txt|manifest\.json|sw\.js|workbox-.*\.js).*)'],
};
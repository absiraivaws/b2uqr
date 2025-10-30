import { verifySessionCookieFromRequest } from './sessionAdmin';

// Server-side helper to be used in Next.js server components or route handlers.
// Pass the incoming Request (or NextRequest) into this function to get the
// decoded Firebase session claims, or null when not authenticated.
export async function getCurrentUser(req: Request) {
  const decoded = await verifySessionCookieFromRequest(req);
  if (!decoded) return null;
  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    name: decoded.name ?? null,
    // include the full claims if needed
    claims: decoded,
  };
}

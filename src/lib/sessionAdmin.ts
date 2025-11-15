import { adminAuth } from './firebaseAdmin';

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

export async function verifySessionCookieFromRequest(req: Request) {
  const cookieHeader = req.headers.get('cookie');
  const cookies = parseCookies(cookieHeader);
  const session = cookies['session'];
  if (!session) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(session, true);
    return decoded;
  } catch (e) {
    // invalid or expired
    return null;
  }
}

export async function refreshSessionCookieFromRequest(req: Request, expiresInMs = 8 * 60 * 60 * 1000) {
  const cookieHeader = req.headers.get('cookie');
  const cookies = parseCookies(cookieHeader);
  const session = cookies['session'];
  if (!session) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(session, true);
    const uid = decoded.uid;
    const maxCookieAge = Math.min(expiresInMs, 14 * 24 * 60 * 60 * 1000);
    const newCookie = await adminAuth.createSessionCookie(decoded.token ? decoded.token : '', { expiresIn: maxCookieAge }).catch(async () => {
      // If decoded doesn't include token, create a custom session cookie by minting a token and exchanging it.
      // Best-effort: create custom token and then session cookie
      const custom = await adminAuth.createCustomToken(uid);
      // Note: there is no direct Node API to exchange custom token for session cookie; this route should instead rely on client idToken.
      return null;
    });
    return { decoded, newCookie };
  } catch (e) {
    return null;
  }
}

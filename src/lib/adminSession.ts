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

/**
 * Given a raw cookie header string, return the admin document (with id) if the
 * admin_session cookie corresponds to a valid, unexpired session. Returns null
 * when session is missing/invalid/expired.
 */
export async function getAdminByCookieHeader(cookieHeader?: string | null) {
  try {
    const cookies = parseCookies(cookieHeader);
    const sessionId = cookies['admin_session'];
    if (!sessionId) return null;

    const sessionDoc = await adminDb.collection('admin_sessions').doc(sessionId).get();
    if (!sessionDoc.exists) return null;
    const session = sessionDoc.data() as any;
    const now = Date.now();
    if ((session?.expires_at_ms || 0) < now) {
      // session expired — best-effort cleanup
      try { await sessionDoc.ref.delete(); } catch (e) { /* ignore */ }
      return null;
    }

    const adminId = session?.adminId;
    if (!adminId) return null;

    const adminDoc = await adminDb.collection('admins').doc(adminId).get();
    if (!adminDoc.exists) return null;
    const admin = adminDoc.data();
    return { id: adminDoc.id, ...admin } as any;
  } catch (err) {
    console.error('getAdminByCookieHeader error', err);
    return null;
  }
}

/**
 * Convenience: accept a raw session id value (cookie value) and return admin.
 */
export async function getAdminBySessionId(sessionId?: string | null) {
  if (!sessionId) return null;
  try {
    const sessionDoc = await adminDb.collection('admin_sessions').doc(sessionId).get();
    if (!sessionDoc.exists) return null;
    const session = sessionDoc.data() as any;
    const now = Date.now();
    if ((session?.expires_at_ms || 0) < now) {
      try { await sessionDoc.ref.delete(); } catch (e) { /* ignore */ }
      return null;
    }
    const adminId = session?.adminId;
    if (!adminId) return null;
    const adminDoc = await adminDb.collection('admins').doc(adminId).get();
    if (!adminDoc.exists) return null;
    return { id: adminDoc.id, ...adminDoc.data() } as any;
  } catch (err) {
    console.error('getAdminBySessionId error', err);
    return null;
  }
}

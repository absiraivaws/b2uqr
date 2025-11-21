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

export async function getStaffByCookieHeader(cookieHeader?: string | null) {
  try {
    const cookies = parseCookies(cookieHeader);
    const sessionId = cookies['staff_session'];
    if (!sessionId) return null;

    const sessionDoc = await adminDb.collection('staff_sessions').doc(sessionId).get();
    if (!sessionDoc.exists) return null;
    const session = sessionDoc.data() as any;
    const now = Date.now();
    if ((session?.expires_at_ms || 0) < now) {
      try { await sessionDoc.ref.delete(); } catch (e) { /* ignore */ }
      return null;
    }

    const staffId = session?.staffId;
    if (!staffId) return null;

    const staffDoc = await adminDb.collection('staff').doc(staffId).get();
    if (!staffDoc.exists) return null;
    const staff = staffDoc.data();
    return { id: staffDoc.id, ...staff } as any;
  } catch (err) {
    console.error('getStaffByCookieHeader error', err);
    return null;
  }
}

export async function getStaffBySessionId(sessionId?: string | null) {
  if (!sessionId) return null;
  try {
    const sessionDoc = await adminDb.collection('staff_sessions').doc(sessionId).get();
    if (!sessionDoc.exists) return null;
    const session = sessionDoc.data() as any;
    const now = Date.now();
    if ((session?.expires_at_ms || 0) < now) {
      try { await sessionDoc.ref.delete(); } catch (e) { /* ignore */ }
      return null;
    }
    const staffId = session?.staffId;
    if (!staffId) return null;
    const staffDoc = await adminDb.collection('staff').doc(staffId).get();
    if (!staffDoc.exists) return null;
    return { id: staffDoc.id, ...staffDoc.data() } as any;
  } catch (err) {
    console.error('getStaffBySessionId error', err);
    return null;
  }
}

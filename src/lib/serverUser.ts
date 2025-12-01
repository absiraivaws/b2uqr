import { cookies } from 'next/headers';
import { adminAuth } from './firebaseAdmin';

export async function getServerUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;
  if (!sessionCookie) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      name: decoded.name ?? null,
      claims: decoded as Record<string, any>,
    };
  } catch (err) {
    console.warn('getServerUser: invalid session', err);
    return null;
  }
}

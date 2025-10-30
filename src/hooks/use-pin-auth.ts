import { auth } from '@/lib/firebase';
import { signInWithCustomToken } from 'firebase/auth';

export async function signInWithPin(identifier: string, pin: string) {
  if (!identifier || !pin) throw new Error('Missing identifier or pin');
  const res = await fetch('/api/auth/signin-pin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, pin }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || 'Sign in failed');
  const customToken = data.customToken as string | undefined;
  if (!customToken) throw new Error('No custom token returned');
  const userCred = await signInWithCustomToken(auth, customToken);
  try {
    const idToken = await userCred.user.getIdToken();
    await fetch('/api/session/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
  } catch (e) {
    console.warn('session create failed after pin signin', e);
  }
  return userCred.user;
}

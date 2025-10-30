import { signOut } from 'firebase/auth';
import { auth } from './firebase';

export async function clientSignOut() {
  // Clear server-side session cookie
  try {
    await fetch('/api/session/destroy', { method: 'POST' });
  } catch (e) {
    console.warn('Failed to call session destroy', e);
  }
  // Clear Firebase client state
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('Firebase client signOut failed', e);
  }
}

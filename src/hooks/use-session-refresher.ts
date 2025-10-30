import { useEffect, useRef } from 'react';
import { auth } from '@/lib/firebase';
import { onIdTokenChanged, User } from 'firebase/auth';

type Options = {
  // How often to refresh session (ms). Default: 1 hour.
  intervalMs?: number;
  // How long the session cookie created by server should live (ms). Default: 8 hours.
  sessionExpiresInMs?: number;
};

/**
 * Hook: keep server session cookie refreshed while user is active.
 *
 * Behavior:
 * - Listens for auth state (onIdTokenChanged). When a user is present, it
 *   immediately exchanges the idToken for a server session cookie via
 *   POST /api/session/create.
 * - Sets up a periodic timer to refresh (exchange a fresh idToken for a new
 *   session cookie) every `intervalMs`.
 * - Also attempts a refresh when the page becomes visible again (tab focus).
 *
 * Note: the server route `/api/session/create` is expected to call
 * adminAuth.createSessionCookie on the provided idToken and set an HttpOnly
 * cookie. The client must be signed in with Firebase SDK so it can provide
 * idToken via user.getIdToken().
 */
export function useSessionRefresher(opts?: Options) {
  const intervalMs = opts?.intervalMs ?? 1000 * 60 * 60; // 1 hour
  const sessionExpiresInMs = opts?.sessionExpiresInMs ?? 8 * 60 * 60 * 1000; // 8 hours
  const activeRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let unsub = () => {};

    const startTimer = (user: User | null) => {
      stopTimer();
      if (!user) return;
      // run first immediate refresh
      refreshOnce(user).catch((e) => console.warn('initial session create failed', e));
      // then schedule periodic refreshes
      timerRef.current = window.setInterval(() => {
        refreshOnce(user).catch(e => console.warn('session refresh failed', e));
      }, intervalMs);
    };

    const stopTimer = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    async function refreshOnce(user: User) {
      try {
        const idToken = await user.getIdToken(true);
        await fetch('/api/session/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken, expiresIn: sessionExpiresInMs }),
        });
      } catch (err) {
        console.warn('useSessionRefresher: refreshOnce failed', err);
        throw err;
      }
    }

    // when auth state changes, start/stop the refresher
    unsub = onIdTokenChanged(auth, (user) => {
      if (user) {
        activeRef.current = true;
        startTimer(user);
      } else {
        activeRef.current = false;
        stopTimer();
      }
    });

    // refresh when page becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && activeRef.current) {
        const user = auth.currentUser;
        if (user) refreshOnce(user).catch(e => console.warn('visibility refresh failed', e));
      }
    };
    window.addEventListener('visibilitychange', handleVisibility);

    return () => {
      try { unsub(); } catch {}
      window.removeEventListener('visibilitychange', handleVisibility);
      stopTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, sessionExpiresInMs]);
}

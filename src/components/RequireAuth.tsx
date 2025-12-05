"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getDefaultRouteForRole, getRequiredPermissionForPath } from '@/lib/roleRouting';

let ensureFirebaseUserPromise: Promise<void> | null = null;

async function ensureFirebaseUserFromSession() {
  if (auth.currentUser) return;
  if (ensureFirebaseUserPromise) return ensureFirebaseUserPromise;

  ensureFirebaseUserPromise = (async () => {
    try {
      const res = await fetch('/api/auth/custom-token', { cache: 'no-store', credentials: 'include' });
      if (res.status === 401 || res.status === 403) return;
      if (!res.ok) throw new Error('custom token request failed');
      const data = await res.json().catch(() => ({}));
      const customToken = data?.customToken as string | undefined;
      if (!customToken || auth.currentUser) return;
      await signInWithCustomToken(auth, customToken);
    } catch (err) {
      console.warn('Failed to hydrate Firebase client from session', err);
    } finally {
      ensureFirebaseUserPromise = null;
    }
  })();

  return ensureFirebaseUserPromise;
}

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    ensureFirebaseUserFromSession();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      try {
        // lightweight server check; force network (no cache)
        const res = await fetch('/api/session/verify', { cache: 'no-store', credentials: 'include' });
        if (cancelled) return;
        if (!res.ok) {
          // replace so the back-button won't return to protected snapshot
          router.replace(`/signin?from=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        const data = await res.json().catch(() => ({}));
        const requiredPermission = getRequiredPermissionForPath(window.location.pathname);
        if (requiredPermission && Array.isArray(data?.permissions) && !data.permissions.includes(requiredPermission)) {
          const fallback = getDefaultRouteForRole(data?.role, data) || '/';
          router.replace(fallback);
        }
      } catch (err) {
        if (!cancelled) router.replace(`/signin?from=${encodeURIComponent(window.location.pathname)}`);
      }
    }

    verify();
    return () => { cancelled = true };
  }, [router]);

  return <>{children}</>;
}

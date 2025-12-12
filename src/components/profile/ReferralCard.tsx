"use client"

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function ReferralCard() {
  const { toast } = useToast();
  const [uid, setUid] = useState<string | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [count, setCount] = useState<number>(0);
  const [referredBy, setReferredBy] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Array<{ referredUid: string; created_at?: any }>>([]);
  const [notAllowed, setNotAllowed] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUid(null);
        setLoading(false);
        return;
      }
      setUid(user.uid);
      try {
        const ref = doc(db, 'users', user.uid);
        let snap;
        try {
          snap = await getDoc(ref);
        } catch (err: any) {
          // Handle permission errors gracefully
          const msg = String(err?.message || err);
          if (err?.code === 'permission-denied' || msg.includes('Missing or insufficient permissions')) {
            setNotAllowed(true);
            setLoading(false);
            return;
          }
          throw err;
        }

        if (snap && snap.exists()) {
          const data = snap.data() as any;
          setPoints(Number(data.referralPoints || 0));
          setCount(Number(data.referralCount || 0));
          setReferredBy(data.referredBy || null);
        }

        // load recent referrals (limit client-side)
        try {
          const refsSnap = await getDocs(collection(db, 'users', user.uid, 'referrals'));
          const list: Array<any> = [];
          refsSnap.forEach((d) => list.push({ referredUid: d.id, ...(d.data() || {}) }));
          setReferrals(list.slice(0, 20));
        } catch (err: any) {
          const msg = String(err?.message || err);
          if (err?.code === 'permission-denied' || msg.includes('Missing or insufficient permissions')) {
            setNotAllowed(true);
            // don't toast for expected permission-denied; just stop loading
            setLoading(false);
            return;
          }
          throw err;
        }
      } catch (e: any) {
        console.error('Failed to load referral data', e);
        toast({ title: 'Load failed', description: 'Unable to load referral data' });
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [toast]);

  const copyLink = async () => {
    if (!uid) return toast({ title: 'Not signed in', description: 'Sign in to get your referral link' });
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_ORIGIN || '');
      const link = `${origin}/signup?ref=${encodeURIComponent(uid)}`;
      await navigator.clipboard.writeText(link);
      toast({ title: 'Copied', description: 'Referral link copied to clipboard' });
    } catch (e) {
      console.error('Copy failed', e);
      toast({ title: 'Copy failed', description: 'Unable to copy link' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Referrals</CardTitle>
        <CardDescription>Share your referral link and track points.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {notAllowed && (
            <div className="p-3 rounded-md bg-yellow-50 text-sm text-yellow-800">
              Referral data unavailable due to Firestore security rules. You can still share your referral link.
            </div>
          )}
          {notAllowed ? (
            <div className="flex items-center justify-between">
              <div />
              <div>
                <Button onClick={copyLink} disabled={!uid}>{uid ? 'Copy referral link' : 'Sign in to share'}</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Points</div>
                  <div className="text-2xl font-semibold">{loading ? '—' : points}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Referrals</div>
                  <div className="text-2xl font-semibold">{loading ? '—' : count}</div>
                </div>
                <div className="ml-auto">
                  <Button onClick={copyLink} disabled={!uid}>{uid ? 'Copy referral link' : 'Sign in to share'}</Button>
                </div>
              </div>

              {referredBy && (
                <div className="text-sm text-muted-foreground">Referred by: <strong>{referredBy}</strong></div>
              )}

              {referrals.length > 0 && (
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Recent referrals</div>
                  <ul className="text-sm list-disc list-inside max-h-40 overflow-auto">
                    {referrals.map((r) => (
                      <li key={r.referredUid}>{r.referredUid}{r.created_at ? ` — ${new Date((r.created_at?.seconds || r.created_at) * 1000).toLocaleString()}` : ''}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

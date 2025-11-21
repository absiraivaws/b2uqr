"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function StaffResetPasswordRequestPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [countdown, setCountdown] = useState<number>(5);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError('Enter a valid email address.');
      return;
    }
    // Verify staff exists before proceeding
    try {
      const checkRes = await fetch('/api/staff/check-exists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const checkData = await checkRes.json();
      if (!checkData?.ok) {
        setError(checkData?.message || 'Could not verify email');
        return;
      }
      if (!checkData.exists) {
        setError('No staff account found for that email.');
        return;
      }
    } catch (err) {
      console.error('check exists failed', err);
      setError('Could not verify email');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/staff/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data?.ok) {
        setError(data?.message || 'Failed to initiate reset.');
        toast({ title: 'Error', description: data?.message || 'Failed to initiate reset.' });
        return;
      }
      setSent(true);
      setCountdown(5);
      toast({ title: 'Reset sent', description: 'Password reset link has been sent.' });
    } catch (err) {
      console.error(err);
      setError('Server error');
      toast({ title: 'Error', description: 'Server error' });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!sent) return;
    let timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push(`https://mail.google.com/mail/u/${email}/#inbox/`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [sent, router]);

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto md:min-h-screen md:flex md:flex-col md:justify-center">
      <Card>
        <CardHeader>
          <CardTitle>Reset staff password</CardTitle>
          <CardDescription>Enter the staff email to request a password reset link.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          {sent ? (
            <div className="space-y-2">
              <div className="text-sm text-center">Password reset link has been sent. The link may take a few minutes to arrive.</div>
              <div className="text-lg text-center">You will be redirected to your inbox in <span className='font-bold'>{countdown} second{countdown !== 1 ? 's' : ''}</span>.</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Staff email</h3>
                </div>
                <div className="flex gap-2">
                  <Input placeholder="staff@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>

              <Separator />

              <div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Request reset'}
                </Button>
              </div>
            </form>
          )}

        </CardContent>
      </Card>
    </main>
  );
}

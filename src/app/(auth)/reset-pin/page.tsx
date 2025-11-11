'use client'
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signInWithCustomToken } from 'firebase/auth';

export default function ResetPinPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  const [cooldownSecs, setCooldownSecs] = useState(0);

  // tick down resend cooldown
  useEffect(() => {
    if (cooldownSecs <= 0) return;
    const id = setInterval(() => setCooldownSecs((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldownSecs]);

  const formatMMSS = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleSend = async () => {
    setError(null);
    setSuccess(null);
    const e = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(e)) {
      setError('Enter a valid email.');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/email/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e, purpose: 'reset-pin' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // If an OTP already exists and is unexpired, start cooldown and allow entering code
        if (res.status === 429) {
          setSent(true);
          const secs = Number(data?.secsLeft ?? 300);
          setCooldownSecs(secs > 0 ? secs : 300);
        } else if (res.status === 404) {
          // user not found for reset
          setError('User not found. Please sign up.');
        } else {
          setError(data?.message || 'Failed to send OTP.');
        }
      } else {
        setSent(true);
        const secs = Number(data?.secsLeft ?? 300);
        setCooldownSecs(secs > 0 ? secs : 300);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to send OTP.');
    } finally {
      setSending(false);
    }
  };

  const handleReset = async () => {
    setError(null);
    setSuccess(null);
    const e = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(e)) return setError('Enter a valid email.');
    if (!/^[0-9]{4,6}$/.test(code)) return setError('Enter the 4-6 digit OTP.');
    if (!/^[0-9]{4,6}$/.test(pin)) return setError('PIN must be 4-6 digits.');
    if (pin !== confirmPin) return setError('PINs do not match.');
    setResetting(true);
    try {
      const res = await fetch('/api/user/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e, code, newPin: pin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message || 'Failed to reset PIN.');
        return;
      }
      const customToken = data?.customToken as string | undefined;
      if (customToken) {
        try {
          const cred = await signInWithCustomToken(auth, customToken);
          const idToken = await cred.user.getIdToken();
          await fetch('/api/session/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          });
        } catch (e) {
          // Not fatal; user can sign in with the new PIN.
          console.warn('Auto sign-in after reset failed', e);
        }
      }
      setSuccess('PIN has been reset. You can sign in now.');
      setTimeout(() => router.push('/signin'), 1200);
    } catch (err: any) {
      setError(err?.message || 'Failed to reset PIN.');
    } finally {
      setResetting(false);
    }
  };

  const handleVerify = async () => {
    setError(null);
    setVerifyMsg(null);
    const e = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(e)) return setError('Enter a valid email.');
    if (!/^[0-9]{4,6}$/.test(code)) return setError('Enter the 4-6 digit OTP.');
    setVerifying(true);
    try {
      const res = await fetch('/api/email/check-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setVerified(false);
        setVerifyMsg(data?.message || 'OTP verification failed.');
      } else {
        setVerified(true);
        const secsLeft = typeof data?.secsLeft === 'number' ? data.secsLeft : undefined;
        setVerifyMsg(secsLeft != null ? `OTP verified. ${secsLeft}s remaining.` : 'OTP verified.');
      }
    } catch (err: any) {
      setVerified(false);
      setVerifyMsg(err?.message || 'OTP verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto md:min-h-screen md:flex md:flex-col md:justify-center">
      <Card>
        <CardHeader>
          <CardTitle>Reset PIN</CardTitle>
          <CardDescription>We&apos;ll send a one-time code to your email. Then set a new PIN.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="flex items-center justify-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center justify-center gap-2 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
              <span>{success}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm">Email</label>
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" type="email" />
            <Separator />
            <Button onClick={handleSend} disabled={sending || !email || cooldownSecs > 0} className="w-full">
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : cooldownSecs > 0 ? (
                `Resend in ${formatMMSS(cooldownSecs)}`
              ) : (
                'Send OTP'
              )}
            </Button>
          </div>

          {sent && (
            <>
              <Separator />
              <div className="space-y-2">
                <label className="text-sm">OTP Code</label>
                <div className="flex items-center gap-2">
                  <Input className="flex-1" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Enter 6-digit code" />
                  <Button onClick={handleVerify} disabled={verifying || code.length !== 6 || verified}>
                    {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : verified ? 'Verified' : 'Verify OTP'}
                  </Button>
                </div>
                {verifyMsg && (
                  <div className="text-center">
                    <span className={verified ? 'text-emerald-600 text-sm' : 'text-destructive text-sm'}>{verifyMsg}</span>
                  </div>
                )}
              </div>
              {verified && (
                <div className="space-y-2">
                  <label className="text-sm">New PIN</label>
                  <Input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="4-6 digit PIN" />
                  <Input value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Confirm PIN" />
                  <Button onClick={handleReset} disabled={resetting || !pin || pin !== confirmPin} className="w-full">
                    {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset PIN'}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

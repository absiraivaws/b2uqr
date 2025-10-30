 'use client'
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, UserPlus, LogIn } from "lucide-react";
import { useEmailOtp } from '@/hooks/use-email-otp';
import { usePhoneOtp } from '@/hooks/use-phone-otp';
// server-side PIN hashing is done via /api/user/set-pin
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState(''); // email or phone input
  const [activeChannel, setActiveChannel] = useState<'email' | 'phone' | null>(null);
  const [identifierSent, setIdentifierSent] = useState(false);
  const [resendSecondsLeft, setResendSecondsLeft] = useState<number | null>(null);
  const [sentOnce, setSentOnce] = useState(false);
  const RESEND_SECONDS = 60; // seconds to wait before allowing resend
  const countdownRef = (globalThis as any).__signup_resend_timer__ as { id?: number } | undefined;

  const [socialLoading, setSocialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedUser, setVerifiedUser] = useState<{
    uid: string;
    phone: string | null;
    displayName?: string | null;
    email?: string | null;
  } | null>(null);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [savingUser, setSavingUser] = useState(false);

  // Phone OTP logic (recaptcha, send/verify) moved to `use-phone-otp` hook.

  const handleSavePinAndCreateUser = async () => {
    setError(null);
    if (!verifiedUser) {
      setError('No verified user available.');
      return;
    }
    if (!/^\d{4,6}$/.test(pin)) {
      setError('PIN must be 4 to 6 digits.');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }
    setSavingUser(true);
    try {
      // Call server API to hash the PIN (Argon2 + PIN_PEPPER) and store it
      const res = await fetch('/api/user/set-pin', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.message || 'Failed to save PIN');
      // redirect after save
      try { router.push('/generate-qr'); } catch (e) { /* ignore */ }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to save user.');
    } finally {
      setSavingUser(false);
    }
  };

  // Simple Google signup stub (existing UI)
  const handleGoogleSignUp = async () => {
    setError(null);
    setSocialLoading(true);
    try {
      console.log('Google signup requested');
      await new Promise(r => setTimeout(r, 800));
    } catch (err) {
      console.error(err);
      setError('Google sign-up failed.');
    } finally {
      setSocialLoading(false);
    }
  };

  // Email and phone logic handled by hooks
  const {
    emailSending,
    emailOtpSent,
    emailOtpError,
    emailOtp,
    setEmailOtp,
    emailVerifying,
    emailVerified,
    handleSendEmailOtp,
    handleVerifyEmailOtp,
    setEmailOtpSent,
    setEmailOtpError,
  } = useEmailOtp({ email, fullName, onVerified: (u) => setVerifiedUser(u) });

  const {
    sendingCode,
    verifyingOtp,
    confirmationRequested,
    otp,
    setOtp,
    handleSendCode,
    handleVerifyOtp,
  } = usePhoneOtp({ phone, fullName, onVerified: (u) => setVerifiedUser(u) });

  useEffect(() => {
    // reset per-channel UI when identifier changes
    setEmailOtpSent(false);
    setEmailOtpError(null);
    setOtp('');
  setIdentifierSent(false);
  setSentOnce(false);
    // clear any existing countdown when user edits identifier
    setResendSecondsLeft(null);
    try {
      if (countdownRef && countdownRef.id) {
        clearInterval(countdownRef.id);
        countdownRef.id = undefined;
      }
    } catch (e) {
      /* ignore */
    }
    // do not clear verifiedUser here
  }, [identifier]);

  const isEmailLike = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim());
  const isPhoneLike = (v: string) => /^\+?[0-9\s\-()]{6,}$/.test(v.trim());

  const handleSendIdentifier = async () => {
    setError(null);
    const v = identifier.trim();
    if (!v) {
      setError('Enter an email or phone number.');
      return;
    }
    // disable the button immediately to avoid duplicate submits
    setIdentifierSent(true);
    try {
      if (isEmailLike(v)) {
        setEmail(v.toLowerCase());
        setActiveChannel('email');
        const res = await handleSendEmailOtp(v.toLowerCase());
        // if server provided secsLeft (on success or 429), align client countdown
        if (res?.ok || res?.data?.secsLeft) {
          const secs = res.data?.secsLeft ?? RESEND_SECONDS;
          setSentOnce(true);
          setResendSecondsLeft(secs);
          setIdentifierSent(true);
        }
        // emailOtpSent hook will also update other state
      } else if (isPhoneLike(v)) {
        // normalize phone minimally - keep as entered for firebase
        setPhone(v);
        setActiveChannel('phone');
        await handleSendCode(v);
        // success will be signaled via confirmationRequested (hook)
      } else {
        setError('Enter a valid email or phone number.');
        setIdentifierSent(false);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to request OTP.');
      // allow retry on error
      setIdentifierSent(false);
    }
  };

  // When either hook indicates a send succeeded, start the resend countdown
  useEffect(() => {
    const sent = emailOtpSent || confirmationRequested;
    if (!sent) return;
    // mark sent and start countdown; if server already provided a TTL,
    // keep it; otherwise initialize to default.
    setIdentifierSent(true);
    setSentOnce(true);
    if (resendSecondsLeft === null) setResendSecondsLeft(RESEND_SECONDS);
    // clear any existing timer
    try { if (countdownRef && countdownRef.id) { clearInterval(countdownRef.id); countdownRef.id = undefined; } } catch (e) {}
    const id = setInterval(() => {
      setResendSecondsLeft(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          // done
          try { if (countdownRef && countdownRef.id) { clearInterval(countdownRef.id); countdownRef.id = undefined; } } catch (e) {}
          setIdentifierSent(false);
          return null;
        }
        return prev - 1;
      });
    }, 1000) as unknown as number;
    // store globally to survive HMR during dev
    try { (globalThis as any).__signup_resend_timer__ = { id }; } catch (e) {}
    return () => {
      try { clearInterval(id); } catch (e) {}
    };
  }, [emailOtpSent, confirmationRequested]);

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <div id="recaptcha-container" />
      <Card>
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>Sign up with phone (OTP) or continue with a social account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="text-sm text-destructive">{error}</div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Continue with Google</h3>
            </div>
            <Button variant="outline" className="w-full flex items-center justify-center gap-2" onClick={handleGoogleSignUp} disabled={socialLoading}>
              {socialLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <LogIn className="h-4 w-4" />}
              <span>{socialLoading ? 'Processing...' : 'Sign up with Google'}</span>
            </Button>
          </div>

          <Separator />

          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="text-sm">Full name</label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Doe" required />
            </div>
            <div>
              <label className="text-sm">Email or phone</label>
              <div className="flex gap-2">
                <Input value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="you@example.com or +94 712 345 678" />
                <Button onClick={handleSendIdentifier} disabled={emailSending || sendingCode || identifierSent}>
                  {emailSending || sendingCode ? (
                    <Loader2 className="animate-spin h-4 w-4" />
                  ) : resendSecondsLeft && resendSecondsLeft > 0 ? (
                    `Sent (${resendSecondsLeft}s)`
                  ) : sentOnce ? (
                    'Resend'
                  ) : (
                    'Send OTP'
                  )}
                </Button>
              </div>
              {error && <div className="text-xs text-destructive mt-1">{error}</div>}
            </div>

            {/* Email OTP UI */}
            {activeChannel === 'email' && !verifiedUser && (
              <div>
                <label className="text-sm">Enter email OTP</label>
                <div className="flex gap-2 mt-1">
                  <Input value={emailOtp} onChange={e => setEmailOtp(e.target.value)} placeholder="123456" />
                  <Button onClick={handleVerifyEmailOtp} disabled={emailVerifying}>
                    {emailVerifying ? <Loader2 className="animate-spin h-4 w-4" /> : 'Verify'}
                  </Button>
                </div>
                {emailOtpError && <div className="text-xs text-destructive mt-1">{emailOtpError}</div>}
                <div className="text-xs text-muted-foreground mt-1">OTP sent to {email || identifier}. Check your inbox.</div>
              </div>
            )}

            {/* Phone OTP UI */}
            {activeChannel === 'phone' && confirmationRequested && !verifiedUser && (
              <div>
                <label className="text-sm">Enter OTP</label>
                <div className="flex gap-2">
                  <Input value={otp} onChange={e => setOtp(e.target.value)} placeholder="123456" />
                  <Button onClick={handleVerifyOtp} disabled={verifyingOtp}>
                    {verifyingOtp ? <Loader2 className="animate-spin h-4 w-4" /> : 'Verify'}
                  </Button>
                </div>
              </div>
            )}

            {verifiedUser && (
              <>
                <div className="text-sm">Verified: <strong>{verifiedUser.email ?? verifiedUser.phone}</strong></div>
                <div>
                  <label className="text-sm">Create 4-6 digit PIN</label>
                  <div className="flex gap-2">
                    <Input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="1234" maxLength={6} />
                  </div>
                </div>
                <div>
                  <label className="text-sm">Confirm PIN</label>
                  <div className="flex gap-2">
                    <Input value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))} placeholder="1234" maxLength={6} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" className="flex-1" onClick={handleSavePinAndCreateUser} disabled={savingUser}>
                    {savingUser ? <Loader2 className="animate-spin h-4 w-4" /> : <UserPlus className="h-4 w-4 mr-2" />}
                    {savingUser ? 'Saving...' : 'Save PIN & Continue'}
                  </Button>
                </div>
              </>
            )}

            <Separator />

          </form>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground mt-4">
        Already have an account? <Button variant="link" className="p-0" onClick={() => router.push('/signin')}>Sign in</Button>
      </p>
    </main>
  );
}

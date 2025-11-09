 'use client'
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, UserPlus, LogIn } from "lucide-react";
import { useEmailOtp } from '@/hooks/use-email-otp';
import { usePhoneOtp } from '@/hooks/use-phone-otp';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
// server-side PIN hashing is done via /api/user/set-pin
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
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

      // Ensure we persist any email/phone present in the form if the
      // verifiedUser object lacks them for some reason. Merge to Firestore
      // using a merge write so we don't overwrite unrelated fields.
      const finalPhone = verifiedUser.phone ?? (phone && phone.toString().trim() ? phone : null);
      const finalEmail = verifiedUser.email ?? (email && email.toString().trim() ? email : null);
      const userDocRef = doc(db, 'users', verifiedUser.uid);
      const payload: any = {
        uid: verifiedUser.uid,
        displayName: verifiedUser.displayName ?? null,
        phone: finalPhone,
        email: finalEmail,
        updated_at: serverTimestamp(),
      };
      // If server returned created timestamp or pin metadata, include it
      if (json.createdAt) payload.created_at = json.createdAt;
      if (json.pinHash) payload.pinHash = json.pinHash;
      await setDoc(userDocRef, payload, { merge: true });

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
  } = useEmailOtp({
    email,
    fullName,
    onVerified: (u) => {
      // merge component state so we keep phone/email even if verification
      // channel didn't return the other value.
      setVerifiedUser({
        uid: u.uid,
        phone: u.phone ?? (phone && phone.toString().trim() ? phone : null),
        displayName: u.displayName ?? (fullName && fullName.toString().trim() ? fullName : null),
        email: u.email ?? (email && email.toString().trim() ? email : null),
      });
    }
  });

  const {
    sendingCode,
    verifyingOtp,
    confirmationRequested,
    otp,
    setOtp,
    handleSendCode,
    handleVerifyOtp,
  } = usePhoneOtp({
    phone,
    fullName,
    onVerified: (u) => {
      // merge component state so we keep phone/email even if verification
      // channel didn't return the other value.
      setVerifiedUser({
        uid: u.uid,
        phone: u.phone ?? (phone && phone.toString().trim() ? phone : null),
        displayName: u.displayName ?? (fullName && fullName.toString().trim() ? fullName : null),
        email: u.email ?? (email && email.toString().trim() ? email : null),
      });
    }
  });

  const sendOtpToEmail = async (emailParam?: string) => {
    // call hook send and, on success, start a longer email-specific countdown
    try {
      const res: any = await handleSendEmailOtp(emailParam);
      // if hook returned an object with ok/data, prefer server-provided TTL
      if (res && res.ok) {
        const secs = res.data?.secsLeft ?? 300; // default 5 minutes for email OTP
        setSentOnce(true);
        setResendSecondsLeft(secs);
      }
      return res;
    } catch (e) {
      // preserve upstream error handling in hook
      return undefined;
    }
  };

  const sendOtpToPhone = async (phoneParam?: string) => {
    return await handleSendCode(phoneParam);
  };

  useEffect(() => {
    // reset per-channel UI when email or phone inputs change
    setEmailOtpSent(false);
    setEmailOtpError(null);
    setOtp('');
    setSentOnce(false);
    // clear any existing countdown when user edits email/phone
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
  }, [email, phone]);

  // When either hook indicates a send succeeded, start the resend countdown
  useEffect(() => {
    const sent = emailOtpSent || confirmationRequested;
    if (!sent) return;
    // mark sent and start countdown; if server already provided a TTL,
    // keep it; otherwise initialize to default.
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
              <label className="text-sm">Phone Number</label>
              <div className='flex gap-2'>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+947xxxxxxxx" required />
                <Button type="button" onClick={() => sendOtpToPhone(phone)} disabled={emailSending || sendingCode || (resendSecondsLeft !== null && resendSecondsLeft > 0)}>
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
            </div>
            <div>
              <label className="text-sm">Email Address</label>
              <div className="flex gap-2">
                <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                <Button type="button" onClick={() => sendOtpToEmail(email)} disabled={emailSending || sendingCode || (resendSecondsLeft !== null && resendSecondsLeft > 0)}>
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
            {emailOtpSent && !verifiedUser && (
              <div>
                <label className="text-sm">Enter email OTP</label>
                <div className="flex gap-2 mt-1">
                  <Input value={emailOtp} onChange={e => setEmailOtp(e.target.value)} placeholder="123456" />
                  <Button onClick={handleVerifyEmailOtp} disabled={emailVerifying}>
                    {emailVerifying ? <Loader2 className="animate-spin h-4 w-4" /> : 'Verify'}
                  </Button>
                </div>
                {emailOtpError && <div className="text-xs text-destructive mt-1">{emailOtpError}</div>}
                <div className="text-xs text-muted-foreground mt-1">OTP sent to {email}. Check your inbox.</div>
              </div>
            )}

            {/* Phone OTP UI */}
            {confirmationRequested && !verifiedUser && (
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

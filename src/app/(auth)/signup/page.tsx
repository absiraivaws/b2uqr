 'use client'
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, UserPlus, LogIn } from "lucide-react";
import { useEmailOtp } from '@/hooks/use-email-otp';
import { usePhoneOtp } from '@/hooks/use-phone-otp';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
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

  // Hash PIN (SHA-256) before saving to Firestore
  const hashPin = async (p: string) => {
    const enc = new TextEncoder();
    const data = enc.encode(p);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

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
      const pinHash = await hashPin(pin);
      const userDocRef = doc(db, 'users', verifiedUser.uid);
      await setDoc(userDocRef, {
        uid: verifiedUser.uid,
        phone: verifiedUser.phone,
        displayName: verifiedUser.displayName ?? null,
        email: verifiedUser.email ?? null,
        pinHash,
        created_at: serverTimestamp()
      });
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
              <label className="text-sm">Email</label>
              <div className="flex gap-2">
                <Input type="email" value={email} onChange={e => { setEmail(e.target.value); setEmailOtpSent(false); setEmailOtpError(null); }} placeholder="you@example.com" required />
                <Button onClick={handleSendEmailOtp} disabled={emailSending}>
                  {emailSending ? <Loader2 className="animate-spin h-4 w-4" /> : 'Send OTP'}
                </Button>
              </div>
                {emailOtpError && <div className="text-xs text-destructive mt-1">{emailOtpError}</div>}
                {emailOtpSent && !emailVerified && (
                  <div className="mt-2">
                    <label className="text-sm">Enter email OTP</label>
                    <div className="flex gap-2 mt-1">
                      <Input value={emailOtp} onChange={e => setEmailOtp(e.target.value)} placeholder="123456" />
                      <Button onClick={handleVerifyEmailOtp} disabled={emailVerifying}>
                        {emailVerifying ? <Loader2 className="animate-spin h-4 w-4" /> : 'Verify'}
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">OTP sent to {email}. Check your inbox.</div>
                  </div>
                )}
                {emailVerified && <div className="text-xs text-success mt-1">Email verified ✓</div>}
            </div>

            <div>
              <label className="text-sm">Phone</label>
              <div className="flex gap-2">
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+94 712 345 678" required />
                <Button onClick={handleSendCode} disabled={sendingCode}>
                  {sendingCode ? <Loader2 className="animate-spin h-4 w-4" /> : 'Send OTP'}
                </Button>
              </div>
            </div>

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
                <div className="text-sm">Phone verified: <strong>{verifiedUser.phone}</strong></div>
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

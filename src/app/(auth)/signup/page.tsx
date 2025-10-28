'use client'
import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, UserPlus, LogIn } from "lucide-react";
import { auth } from '@/lib/firebase';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  updateProfile,
  EmailAuthProvider,
  linkWithCredential
} from "firebase/auth";
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otp, setOtp] = useState('');
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
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaWidgetIdRef = useRef<number | null>(null);

  // Initialize (or reuse) invisible reCAPTCHA and render it
  const setupRecaptcha = async () => {
    // ensure language follows device/browser preference
    try { auth.useDeviceLanguage(); } catch { /* ignore if not available */ }

    if (recaptchaRef.current) return recaptchaRef.current;
    // Firebase Auth version in this project expects (auth, container, params)
    const verifier = new RecaptchaVerifier(
      auth,
      'recaptcha-container',
      { size: 'invisible' }
    );
    recaptchaRef.current = verifier;
    try {
      const widgetId = await verifier.render();
      recaptchaWidgetIdRef.current = typeof widgetId === 'number' ? widgetId : null;
    } catch (e) {
      // render may fail if grecaptcha isn't ready yet; keep verifier for later
      console.warn('recaptcha render failed', e);
      recaptchaWidgetIdRef.current = null;
    }
    return verifier;
  };

  const resetRecaptcha = () => {
    try {
      const wid = recaptchaWidgetIdRef.current;
      // prefer grecaptcha.reset if widgetId available
      if (typeof wid === 'number' && (window as any).grecaptcha && (window as any).grecaptcha.reset) {
        try { (window as any).grecaptcha.reset(wid); } catch (e) { /* ignore */ }
      } else if (recaptchaRef.current && typeof (recaptchaRef.current as any).clear === 'function') {
        try { (recaptchaRef.current as any).clear(); } catch (e) { /* ignore */ }
      }
    } finally {
      recaptchaRef.current = null;
      recaptchaWidgetIdRef.current = null;
    }
  };

  const handleSendCode = async () => {
    setError(null);
    if (!phone) {
      setError('Phone number is required.');
      return;
    }
    setSendingCode(true);
    try {
      const appVerifier = await setupRecaptcha();
      const result = await signInWithPhoneNumber(auth, phone, appVerifier as any);
      setConfirmationResult(result);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to send OTP.');
      // Reset so user can retry
      resetRecaptcha();
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError(null);
    if (!confirmationResult) {
      setError('No OTP request found. Please request code again.');
      return;
    }
    if (!otp) {
      setError('Enter OTP.');
      return;
    }
    setVerifyingOtp(true);
    try {
      const userCredential = await confirmationResult.confirm(otp);
      // update profile with display name if provided
      if (fullName) {
        try {
          await updateProfile(userCredential.user, { displayName: fullName });
        } catch (e) {
          // non-fatal
          console.warn('updateProfile failed', e);
        }
      }

      // Optionally link email/password if provided and passwords match
      if (email && password && password === confirm) {
        try {
          const emailCred = EmailAuthProvider.credential(email, password);
          await linkWithCredential(userCredential.user, emailCred);
        } catch (linkErr: any) {
          // linking may fail if email already in use; surface useful message
          console.error('link error', linkErr);
          if (linkErr?.code === 'auth/email-already-in-use') {
            setError('Email already in use; account created with phone. You can sign in with phone.');
          } else {
            setError(linkErr?.message || 'Failed to link email credential.');
          }
        }
      }

      // Success: keep user info and prompt to create a PIN before redirect
      console.log('Phone sign-up successful', userCredential.user.uid);
      setVerifiedUser({
        uid: userCredential.user.uid,
        phone: userCredential.user.phoneNumber ?? phone,
        displayName: userCredential.user.displayName ?? fullName ?? null,
        email: userCredential.user.email ?? email ?? null,
      });
      // clear confirmation result and recaptcha (we still keep user signed-in)
      setConfirmationResult(null);
      resetRecaptcha();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'OTP verification failed.');
      // On bad code allow retry by resetting verifier so a new challenge can be created
      resetRecaptcha();
    } finally {
      setVerifyingOtp(false);
    }
  };

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
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div>
              <label className="text-sm">Email (optional)</label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>

            <div>
              <label className="text-sm">Phone</label>
              <div className="flex gap-2">
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+94 712 345 678" />
                <Button onClick={handleSendCode} disabled={sendingCode}>
                  {sendingCode ? <Loader2 className="animate-spin h-4 w-4" /> : 'Send OTP'}
                </Button>
              </div>
            </div>

            {confirmationResult && !verifiedUser && (
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

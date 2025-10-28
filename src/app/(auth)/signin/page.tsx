'use client'
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Loader2, LogIn } from "lucide-react";
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function SignInPage() {
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [phone, setPhone] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [otp, setOtp] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingEmail, setSigningEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [signingPin, setSigningPin] = useState(false);
  const router = useRouter();

  // TODO: Replace stub handlers with firebase auth logic
  const handleGoogleSignIn = async () => {
    setError(null);
    setLoadingGoogle(true);
    try {
      console.log("Google sign-in requested");
      // TODO: signInWithPopup(auth, provider)
      await new Promise(r => setTimeout(r, 800));
    } catch (err) {
      console.error(err);
      setError('Google sign-in failed.');
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleSendCode = async () => {
    setError(null);
    if (!phone) {
      setError('Please enter phone number.');
      return;
    }
    setSendingCode(true);
    try {
      console.log('Send OTP to', phone);
      // TODO: use Firebase Recaptcha + signInWithPhoneNumber
      await new Promise(r => setTimeout(r, 800));
    } catch (err) {
      console.error(err);
      setError('Failed to send code.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    setError(null);
    if (!otp) {
      setError('Please enter the OTP code.');
      return;
    }
    setVerifyingOtp(true);
    try {
      console.log('Verify OTP', otp);
      // TODO: confirm result from Firebase
      await new Promise(r => setTimeout(r, 800));
    } catch (err) {
      console.error(err);
      setError('OTP verification failed.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    setSigningEmail(true);
    try {
      console.log('Email sign-in', email);
      // TODO: signInWithEmailAndPassword(auth, email, password)
      await new Promise(r => setTimeout(r, 800));
    } catch (err) {
      console.error(err);
      setError('Email sign-in failed.');
    } finally {
      setSigningEmail(false);
    }
  };

  // SHA-256 hash helper (returns hex)
  const hashPin = async (p: string) => {
    const enc = new TextEncoder();
    const data = enc.encode(p);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handlePinSignIn = async () => {
    setError(null);
    if (!phone) {
      setError('Please enter phone number.');
      return;
    }
    if (!/^\d{4,6}$/.test(pin)) {
      setError('PIN must be 4 to 6 digits.');
      return;
    }
    setSigningPin(true);
    try {
      // Query users collection for phone
      const q = query(collection(db, 'users'), where('phone', '==', phone));
      const snap = await getDocs(q);
      if (snap.empty) {
        setError('No account found for this phone.');
        return;
      }
      const userDoc = snap.docs[0].data() as any;
      const storedHash = userDoc.pinHash;
      const inputHash = await hashPin(pin);
      if (inputHash !== storedHash) {
        setError('Invalid PIN.');
        return;
      }
      // Consider user signed in: persist minimal client session and redirect
      try { localStorage.setItem('user_uid', userDoc.uid); } catch(_) {}
      router.push('/generate-qr');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'PIN sign-in failed.');
    } finally {
      setSigningPin(false);
    }
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Choose a sign-in method below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          {/* Google */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Continue with Google</h3>
            </div>
            <Button variant="outline" className="w-full flex items-center justify-center gap-2" onClick={handleGoogleSignIn} disabled={loadingGoogle}>
              {loadingGoogle ? <Loader2 className="animate-spin h-4 w-4" /> : <LogIn className="h-4 w-4" />}
              <span>{loadingGoogle ? 'Signing in...' : 'Sign in with Google'}</span>
            </Button>
          </div>

          <Separator />

          {/* Phone */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Sign in with phone (OTP or PIN)</h3>
              <span className="text-xs text-muted-foreground">SMS code or your PIN</span>
            </div>
            <div className="flex gap-2">
              <Input placeholder="+94 712 345 678" value={phone} onChange={e => setPhone(e.target.value)} />
              <Button onClick={handleSendCode} disabled={sendingCode}>
                {sendingCode ? <Loader2 className="animate-spin h-4 w-4" /> : 'Send Code'}
              </Button>
            </div>

            <div className="flex gap-2">
              <Input placeholder="Enter OTP" value={otp} onChange={e => setOtp(e.target.value)} />
              <Button onClick={handleVerifyCode} disabled={verifyingOtp}>
                {verifyingOtp ? <Loader2 className="animate-spin h-4 w-4" /> : 'Verify'}
              </Button>
            </div>

            <div className="mt-2">
              <label className="text-sm">Or sign in with PIN</label>
              <div className="flex gap-2 mt-1">
                <Input placeholder="4-6 digit PIN" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0,6))} />
                <Button onClick={handlePinSignIn} disabled={signingPin}>
                  {signingPin ? <Loader2 className="animate-spin h-4 w-4" /> : 'Sign in with PIN'}
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Email/password */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Email & Password</h3>
            </div>
            <form onSubmit={handleEmailSignIn} className="space-y-2">
              <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
              <div className="flex items-center justify-between gap-2">
                <Button type="submit" className="flex-1" disabled={signingEmail}>
                  {signingEmail ? <Loader2 className="animate-spin h-4 w-4" /> : 'Sign in'}
                </Button>
                <Button variant="ghost" className="text-sm" onClick={() => console.log('Navigate to forgot password')}>
                  Forgot?
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground mt-4">
        New here? <Button variant="link" className="p-0" onClick={() => router.push('/signup')}>Create an account</Button>
      </p>
    </main>
  );
}

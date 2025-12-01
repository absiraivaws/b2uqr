 'use client'
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, LogIn } from "lucide-react";
import { useRouter } from 'next/navigation';
import SignupKycSection, { KycValues } from '@/components/signup/SignupKycSection';
import SignupOtpSection from '@/components/signup/SignupOtpSection';
import SignupPinSection from '@/components/signup/SignupPinSection';
import { auth } from '@/lib/firebase';

type AccountType = 'individual' | 'company';

export default function SignUpPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType>('individual');
  const [kyc, setKyc] = useState<KycValues>({
    displayName: '',
    nic: '',
    businessReg: '',
    address: '',
    lat: '',
    lng: '',
    companyName: '',
  });
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // this is to enable/disable phone OTP button
  const enablePhoneOtp = false

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
    // basic required validations for additional KYC fields
    if (!kyc.displayName.trim() || !kyc.nic.trim() || !kyc.businessReg.trim() || !kyc.address.trim() || kyc.lat === '' || kyc.lng === '') {
      setError('Please complete your full name, NIC, business registration number, address, and location.');
      return;
    }
    if (accountType === 'company' && !kyc.companyName?.trim()) {
      setError('Please enter your company name.');
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

      const finalPhone = verifiedUser.phone ?? (phone && phone.toString().trim() ? phone : null);
      const finalEmail = verifiedUser.email ?? (email && email.toString().trim() ? email : null);

      const onboardRes = await fetch('/api/merchant/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountType,
          kyc,
          contact: {
            phone: finalPhone,
            email: finalEmail,
          },
        }),
      });
      const onboardJson = await onboardRes.json().catch(() => ({}));
      if (!onboardRes.ok || !onboardJson?.ok) {
        throw new Error(onboardJson?.message || 'Failed to save merchant profile');
      }

      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const idToken = await currentUser.getIdToken(true);
          await fetch('/api/session/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          });
        }
      } catch (refreshErr) {
        console.warn('session refresh after onboarding failed', refreshErr);
      }

        const companySlug = accountType === 'company' ? (onboardJson?.companySlug as string | undefined) : undefined;
        const nextPath = accountType === 'company'
          ? (companySlug ? `/${companySlug}/branches` : null)
          : null;
      const nextQuery = nextPath ? `&next=${encodeURIComponent(nextPath)}` : '';
      router.push(`/verify-customer?uid=${verifiedUser.uid}${nextQuery}`);
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

  // OTP hooks and resend logic are handled inside SignupOtpSection

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto md:min-h-screen md:flex md:flex-col md:justify-center">
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

          {false && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Continue with Google</h3>
              </div>
              <Button variant="outline" className="w-full flex items-center justify-center gap-2" onClick={handleGoogleSignUp} disabled={socialLoading}>
                {socialLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                <span>{socialLoading ? 'Processing...' : 'Sign up with Google'}</span>
              </Button>
            </div>
          )}

          <Separator />

            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div className="space-y-3">
                <Label className="text-sm font-medium">Account type</Label>
                <RadioGroup
                  value={accountType}
                  onValueChange={(value) => setAccountType(value as AccountType)}
                  className="grid gap-3 md:grid-cols-2"
                >
                  <label htmlFor="account-individual" className={`border rounded-lg p-4 flex gap-3 cursor-pointer transition shadow-sm ${accountType === 'individual' ? 'border-primary ring-2 ring-primary/50' : 'border-border'}`}>
                    <RadioGroupItem id="account-individual" value="individual" />
                    <div>
                      <p className="font-medium text-sm">Individual merchant</p>
                      <p className="text-xs text-muted-foreground">Access QR, transactions, summary, profile.</p>
                    </div>
                  </label>
                  <label htmlFor="account-company" className={`border rounded-lg p-4 flex gap-3 cursor-pointer transition shadow-sm ${accountType === 'company' ? 'border-primary ring-2 ring-primary/50' : 'border-border'}`}>
                    <RadioGroupItem id="account-company" value="company" />
                    <div>
                      <p className="font-medium text-sm">Company</p>
                      <p className="text-xs text-muted-foreground">Manage branches, managers, and cashiers.</p>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              <SignupKycSection values={kyc} onChange={setKyc} accountType={accountType} />
              <SignupOtpSection
                email={email}
                setEmail={setEmail}
                phone={phone}
                setPhone={setPhone}
                fullName={kyc.displayName}
                enablePhoneOtp={enablePhoneOtp}
                errorBelowEmail={error}
                onVerified={(u) => setVerifiedUser({
                  uid: u.uid,
                  phone: u.phone ?? (phone && phone.toString().trim() ? phone : null),
                  displayName: u.displayName ?? (kyc.displayName && kyc.displayName.toString().trim() ? kyc.displayName : null),
                  email: u.email ?? (email && email.toString().trim() ? email : null),
                })}
              />

              {verifiedUser && (
                <>
                  <div className="text-sm">Verified: <strong>{verifiedUser.email ?? verifiedUser.phone}</strong></div>
                  <SignupPinSection
                    pin={pin}
                    setPin={setPin}
                    confirmPin={confirmPin}
                    setConfirmPin={setConfirmPin}
                    saving={savingUser}
                    onSave={handleSavePinAndCreateUser}
                  />
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

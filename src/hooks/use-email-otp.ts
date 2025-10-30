import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { signInWithCustomToken } from 'firebase/auth';

type VerifiedUser = {
  uid: string;
  phone: string | null;
  displayName?: string | null;
  email?: string | null;
};

export function useEmailOtp({ email, fullName, onVerified }: { email: string; fullName?: string; onVerified: (u: VerifiedUser) => void }) {
  const [emailSending, setEmailSending] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpError, setEmailOtpError] = useState<string | null>(null);
  const [emailOtp, setEmailOtp] = useState('');
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const handleSendEmailOtp = async (overrideEmail?: string) => {
    setEmailOtpError(null);
    const targetEmail = (overrideEmail ?? email).toString().trim().toLowerCase();
    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      setEmailOtpError('Email is required.');
      return;
    }
    setEmailSending(true);
    try {
      const res = await fetch('/api/email/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEmailOtpError((data && data.message) || 'Failed to send OTP.');
        return { ok: false, data };
      } else {
        setEmailOtpSent(true);
        return { ok: true, data };
      }
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || 'Failed to send OTP.';
      setEmailOtpError(msg);
      return { ok: false, data: { message: msg } };
    } finally {
      setEmailSending(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    setEmailOtpError(null);
    if (!email) {
      setEmailOtpError('Email is required.');
      return;
    }
    if (!emailOtp) {
      setEmailOtpError('Enter OTP.');
      return;
    }
    setEmailVerifying(true);
    try {
      const res = await fetch('/api/email/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: emailOtp, fullName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEmailOtpError((data && data.message) || 'OTP verification failed.');
      } else {
        // server created user and returned custom token
        const customToken = data.customToken as string | undefined;
        const uid = data.uid as string | undefined;
        if (customToken) {
          // sign in client with custom token
          const userCred = await signInWithCustomToken(auth, customToken);
          try {
            // create session cookie on server
            const idToken = await userCred.user.getIdToken();
            await fetch('/api/session/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken }),
            });
          } catch (e) {
            console.warn('session create failed', e);
          }
          const verifiedUser = {
            uid: userCred.user.uid,
            phone: userCred.user.phoneNumber ?? null,
            displayName: userCred.user.displayName ?? fullName ?? null,
            email: userCred.user.email ?? email ?? null,
          };
          setEmailVerified(true);
          setEmailOtpSent(false);
          onVerified(verifiedUser);
        } else {
          // fallback: use uid returned but client not signed in
          const displayName = data.displayName as string | undefined;
          const verifiedUser = {
            uid: uid || '',
            phone: null,
            displayName: displayName ?? fullName ?? null,
            email: email ?? null,
          };
          setEmailVerified(true);
          setEmailOtpSent(false);
          onVerified(verifiedUser);
        }
      }
    } catch (err: any) {
      console.error(err);
      setEmailOtpError(err?.message || 'OTP verification failed.');
    } finally {
      setEmailVerifying(false);
    }
  };

  return {
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
  } as const;
}

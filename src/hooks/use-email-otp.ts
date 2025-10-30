import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

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

  const handleSendEmailOtp = async () => {
    setEmailOtpError(null);
    if (!email) {
      setEmailOtpError('Email is required.');
      return;
    }
    setEmailSending(true);
    try {
      const res = await fetch('/api/email/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEmailOtpError((data && data.message) || 'Failed to send OTP.');
      } else {
        setEmailOtpSent(true);
      }
    } catch (err: any) {
      console.error(err);
      setEmailOtpError(err?.message || 'Failed to send OTP.');
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
        body: JSON.stringify({ email, code: emailOtp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEmailOtpError((data && data.message) || 'OTP verification failed.');
      } else {
        // create Firebase Auth user client-side (temporary password)
        try {
          const pw = Array.from(window.crypto.getRandomValues(new Uint8Array(16))).map(b => (b % 36).toString(36)).join('') + '!A1';
          const userCredential = await createUserWithEmailAndPassword(auth, email, pw);
          try { if (fullName) await updateProfile(userCredential.user, { displayName: fullName }); } catch (e) { console.warn('updateProfile failed', e); }

          const verifiedUser = {
            uid: userCredential.user.uid,
            phone: userCredential.user.phoneNumber ?? null,
            displayName: userCredential.user.displayName ?? fullName ?? null,
            email: userCredential.user.email ?? email ?? null,
          };
          setEmailVerified(true);
          setEmailOtpSent(false);
          onVerified(verifiedUser);
        } catch (authErr: any) {
          console.error('createUserWithEmailAndPassword failed', authErr);
          if (authErr?.code === 'auth/email-already-in-use') {
            setEmailOtpError('Email already in use. Please sign in instead.');
          } else {
            setEmailOtpError(authErr?.message || 'Failed to create auth user.');
          }
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

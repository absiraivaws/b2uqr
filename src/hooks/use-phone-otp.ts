import { useRef, useState } from 'react';
import { auth } from '@/lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, updateProfile } from 'firebase/auth';

type VerifiedUser = {
  uid: string;
  phone: string | null;
  displayName?: string | null;
  email?: string | null;
};

export function usePhoneOtp({ phone, fullName, onVerified }: { phone: string; fullName?: string; onVerified: (u: VerifiedUser) => void }) {
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otp, setOtp] = useState('');
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaWidgetIdRef = useRef<number | null>(null);

  const setupRecaptcha = async () => {
    try { auth.useDeviceLanguage(); } catch { /* ignore */ }
    if (recaptchaRef.current) return recaptchaRef.current;
    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
    recaptchaRef.current = verifier;
    try {
      const widgetId = await verifier.render();
      recaptchaWidgetIdRef.current = typeof widgetId === 'number' ? widgetId : null;
    } catch (e) {
      console.warn('recaptcha render failed', e);
      recaptchaWidgetIdRef.current = null;
    }
    return verifier;
  };

  const resetRecaptcha = () => {
    try {
      const wid = recaptchaWidgetIdRef.current;
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

  const handleSendCode = async (overridePhone?: string) => {
    const targetPhone = (overridePhone ?? phone)?.toString().trim();
    if (!targetPhone) return;
    setSendingCode(true);
    try {
      const appVerifier = await setupRecaptcha();
      const result = await signInWithPhoneNumber(auth, targetPhone, appVerifier as any);
      setConfirmationResult(result);
    } catch (err: any) {
      console.error(err);
      resetRecaptcha();
      throw err;
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!confirmationResult) throw new Error('No OTP request found.');
    if (!otp) throw new Error('Enter OTP.');
    setVerifyingOtp(true);
    try {
      const userCredential = await confirmationResult.confirm(otp);
      if (fullName) {
        try { await updateProfile(userCredential.user, { displayName: fullName }); } catch (e) { console.warn('updateProfile failed', e); }
      }
      const verifiedUser = {
        uid: userCredential.user.uid,
        phone: userCredential.user.phoneNumber ?? phone,
        displayName: userCredential.user.displayName ?? fullName ?? null,
        email: userCredential.user.email ?? null,
      };
      setConfirmationResult(null);
      resetRecaptcha();
      // userCredential.user is signed in client-side; create a server session cookie
      try {
        const idToken = await userCredential.user.getIdToken();
        await fetch('/api/session/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
      } catch (e) {
        console.warn('session create failed for phone user', e);
      }
      onVerified(verifiedUser);
    } catch (err: any) {
      console.error(err);
      resetRecaptcha();
      throw err;
    } finally {
      setVerifyingOtp(false);
    }
  };

  return {
    sendingCode,
    verifyingOtp,
    confirmationRequested: Boolean(confirmationResult),
    otp,
    setOtp,
    handleSendCode,
    handleVerifyOtp,
  } as const;
}

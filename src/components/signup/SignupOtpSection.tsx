"use client";
import React, { useEffect, useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, LogIn } from "lucide-react";
import { useEmailOtp } from '@/hooks/use-email-otp';
import { usePhoneOtp } from '@/hooks/use-phone-otp';

type VerifiedUser = {
  uid: string;
  whatsappNumber: string | null;
  displayName?: string | null;
  email?: string | null;
};

interface SignupOtpSectionProps {
  email: string;
  setEmail: (v: string) => void;
  whatsappNumber: string;
  setWhatsappNumber: (v: string) => void;
  fullName: string;
  enablePhoneOtp?: boolean;
  onVerified: (u: VerifiedUser) => void;
  showSocial?: boolean;
  errorBelowEmail?: string | null;
  ensureReadyForOtp?: () => string | null;
}

export default function SignupOtpSection({
  email,
  setEmail,
  whatsappNumber,
  setWhatsappNumber,
  fullName,
  enablePhoneOtp = false,
  onVerified,
  showSocial = false,
  errorBelowEmail,
  ensureReadyForOtp,
}: SignupOtpSectionProps) {
  const [socialLoading, setSocialLoading] = useState(false);
  const [resendSecondsLeft, setResendSecondsLeft] = useState<number | null>(null);
  const [sentOnce, setSentOnce] = useState(false);
  const RESEND_SECONDS = 60;

  // global ref to survive HMR in dev
  const countdownRef = (globalThis as any).__signup_resend_timer__ as { id?: number } | undefined;

  const {
    emailSending,
    emailOtpSent,
    emailOtpError,
    emailOtp,
    setEmailOtp,
    emailVerifying,
    handleSendEmailOtp,
    handleVerifyEmailOtp,
    setEmailOtpSent,
    setEmailOtpError,
  } = useEmailOtp({
    email,
    fullName,
    onVerified,
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
    whatsappNumber,
    fullName,
    onVerified,
  });

  const handleGoogleSignUp = async () => {
    setSocialLoading(true);
    try {
      await new Promise(r => setTimeout(r, 800));
    } finally {
      setSocialLoading(false);
    }
  };

  const sendOtpToEmail = async (emailParam?: string) => {
    if (ensureReadyForOtp) {
      const guardResult = ensureReadyForOtp();
      if (guardResult) return;
    }
    try {
      const res: any = await handleSendEmailOtp(emailParam);
      if (res && res.ok) {
        const secs = res.data?.secsLeft ?? 300; // default 5 minutes for email OTP
        setSentOnce(true);
        setResendSecondsLeft(secs);
      }
      return res;
    } catch (e) {
      return undefined;
    }
  };

  const sendOtpToWhatsapp = async (whatsappParam?: string) => {
    if (ensureReadyForOtp) {
      const guardResult = ensureReadyForOtp();
      if (guardResult) return;
    }
    return await handleSendCode(whatsappParam);
  };

  // Reset OTP UI when email or phone change
  useEffect(() => {
    setEmailOtpSent(false);
    setEmailOtpError(null);
    setOtp('');
    setSentOnce(false);
    setResendSecondsLeft(null);
    try {
      if (countdownRef && countdownRef.id) {
        clearInterval(countdownRef.id);
        countdownRef.id = undefined;
      }
    } catch {}
  }, [email, whatsappNumber]);

  // Start resend countdown after sending
  useEffect(() => {
    const sent = emailOtpSent || confirmationRequested;
    if (!sent) return;
    setSentOnce(true);
    if (resendSecondsLeft === null) setResendSecondsLeft(RESEND_SECONDS);
    try { if (countdownRef && countdownRef.id) { clearInterval(countdownRef.id); countdownRef.id = undefined; } } catch {}
    const id = setInterval(() => {
      setResendSecondsLeft(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          try { if (countdownRef && countdownRef.id) { clearInterval(countdownRef.id); countdownRef.id = undefined; } } catch {}
          return null;
        }
        return prev - 1;
      });
    }, 1000) as unknown as number;
    try { (globalThis as any).__signup_resend_timer__ = { id }; } catch {}
    return () => { try { clearInterval(id); } catch {} };
  }, [emailOtpSent, confirmationRequested]);

  return (
    <>
      {showSocial && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Continue with Google</h3>
          </div>
          <Button variant="outline" className="w-full flex items-center justify-center gap-2" onClick={handleGoogleSignUp} disabled={socialLoading}>
            {socialLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            <span>{socialLoading ? 'Processing...' : 'Sign up with Google'}</span>
          </Button>
          <Separator />
        </div>
      )}

      <div>
        <label className="text-sm">WhatsApp Number</label>
        <div className='flex gap-2'>
          <Input value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} placeholder="+947xxxxxxxx" required />
          {enablePhoneOtp && (
            <Button type="button" onClick={() => sendOtpToWhatsapp(whatsappNumber)} disabled={emailSending || sendingCode || (resendSecondsLeft !== null && resendSecondsLeft > 0)}>
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
          )}
        </div>
      </div>

      <div>
        <label className="text-sm">Email Address</label>
        <div className="flex gap-2">
          <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          <Button
            type="button"
            className='hidden md:inline-flex'
            onClick={() => sendOtpToEmail(email)}
            disabled={emailSending || sendingCode || (resendSecondsLeft !== null && resendSecondsLeft > 0)}
          >
            {emailSending || sendingCode ? (
              <Loader2 className="animate-spin h-4 w-4" />
            ) : resendSecondsLeft && resendSecondsLeft > 0 ? (
              `Sent (${resendSecondsLeft}s)`
            ) : sentOnce ? (
              'Resend'
            ) : (
              'Request OTP'
            )}
          </Button>
        </div>
        {errorBelowEmail && <div className="text-xs text-destructive mt-1">{errorBelowEmail}</div>}
        <Button
          type="button"
          className='md:hidden w-full mt-4'
          onClick={() => sendOtpToEmail(email)}
          disabled={emailSending || sendingCode || (resendSecondsLeft !== null && resendSecondsLeft > 0)}
        >
          {emailSending || sendingCode ? (
            <Loader2 className="animate-spin h-4 w-4" />
          ) : resendSecondsLeft && resendSecondsLeft > 0 ? (
            `Sent (${resendSecondsLeft}s)`
          ) : sentOnce ? (
            'Resend'
          ) : (
            'Request OTP'
          )}
        </Button>
      </div>

      {/* Email OTP UI */}
      {emailOtpSent && (
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
      {confirmationRequested && (
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
    </>
  );
}

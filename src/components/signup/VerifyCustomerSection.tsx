'use client'

import React, { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import ProfileStep from '@/components/signup/steps/ProfileStep';
import NicFrontStep from '@/components/signup/steps/NicFrontStep';
import NicBackStep from '@/components/signup/steps/NicBackStep';
import QrStep from '@/components/signup/steps/QrStep';
import CompleteStep from '@/components/signup/steps/CompleteStep';
import { db, storage } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { processImage, uploadBlob as uploadBlobHelper } from '@/lib/verificationHelpers';
import { useRouter } from 'next/navigation';

interface VerifyCustomerSectionProps {
  uid: string;
  next?: string | null;
}

interface UserProfileMeta {
  email?: string | null;
  accountType?: string | null;
  companyId?: string | null;
}

export default function VerifyCustomerSection({ uid, next }: VerifyCustomerSectionProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfileMeta | null>(null);

  // Previews and blobs
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [profileBlob, setProfileBlob] = useState<Blob | null>(null);
  const profileFileRef = useRef<HTMLInputElement | null>(null);

  const [nicFrontPreview, setNicFrontPreview] = useState<string | null>(null);
  const [nicFrontBlob, setNicFrontBlob] = useState<Blob | null>(null);

  const [nicBackPreview, setNicBackPreview] = useState<string | null>(null);
  const [nicBackBlob, setNicBackBlob] = useState<Blob | null>(null);

  const [uploading, setUploading] = useState(false);
  const [qrParsed, setQrParsed] = useState<any | null>(null);
  // Camera refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [redirectEmail, setRedirectEmail] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number>(5);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (!active) return;
        if (userDoc.exists()) {
          const data = userDoc.data() as any;
          const derivedAccountType = data?.accountType
            || (data?.role === 'company-owner' ? 'company' : data?.role === 'individual' ? 'individual' : null);
          setUserProfile({
            email: data?.email ?? null,
            accountType: derivedAccountType,
            companyId: data?.companyId ?? null,
          });
          if (data?.email) setRedirectEmail(String(data.email));
        }
      } catch (e) {
        console.error('fetch user profile error', e);
      }
    })();

    return () => {
      active = false;
    };
  }, [uid]);

  useEffect(() => {
    if (step !== 4) return;

    // When onboarding reaches the final step, attempt to confirm KYC server-side
    // so pending referrals can be awarded.
    (async () => {
      try {
        await fetch('/api/user/confirm-kyc', { method: 'POST', credentials: 'include' });
      } catch (e) {
        // Non-critical; ignore errors here
        console.warn('confirm-kyc call failed', e);
      }
    })();

    setRedirectCountdown(10);
    const interval = window.setInterval(() => {
      setRedirectCountdown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);

    const timeoutId = window.setTimeout(() => {
      const target = next && next.length
        ? next
        : (redirectEmail ? `/signin?email=${encodeURIComponent(redirectEmail)}` : '/signin');
      try { router.push(target); } catch (e) { /* ignore */ }
    }, 10000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeoutId);
    };
  }, [step, next, redirectEmail, router]);

  const startCamera = async () => {
    try {
      // show video element first so `videoRef` can be attached
      setCameraActive(true);
      setVideoReady(false);
      // wait a tick for the video element to mount
      await new Promise((r) => setTimeout(r, 50));

      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = s;
      if (videoRef.current) {
        try {
          videoRef.current.srcObject = s;
          await videoRef.current.play();
          // video playback started and stream visible
          setVideoReady(true);
        } catch (err) {
          console.error('video play error', err);
        }
      }
      setCameraActive(true);
    } catch (e) {
      console.error('camera start error', e);
      toast({ title: 'Camera error', description: 'Unable to access camera', variant: 'destructive' });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        // clear srcObject to stop the preview
        // @ts-ignore
        videoRef.current.srcObject = null;
      } catch (e) { /* ignore */ }
      videoRef.current.pause();
    }
    setCameraActive(false);
    setVideoReady(false);
  };

  // `processImage` provided by helpers

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, setPreview: (s: string|null)=>void, setBlob: (b: Blob|null)=>void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    (async () => {
      // process uploaded file: center-crop profile by default, NIC not cropped
      const processed = await processImage(file, { cropToSquare: false, maxSize: 1024, quality: 0.8 });
      const finalBlob = processed ?? file;
      const url = URL.createObjectURL(finalBlob);
      setPreview(url);
      setBlob(finalBlob);
    })();
  };

  const uploadBlob = async (blob: Blob, path: string) => {
    return await uploadBlobHelper(storage, path, blob);
  };

  const completeStepUpload = async () => {
    setUploading(true);
    try {
      const userDocRef = doc(db, 'users', uid);
      if (step === 0 && profileBlob) {
        const url = await uploadBlob(profileBlob, `users/${uid}/profile_${Date.now()}.jpg`);
        await updateDoc(userDocRef, { profileImageURL: url });
        toast({ title: 'Uploaded', description: 'Profile image uploaded' });
      }
      if (step === 1 && nicFrontBlob) {
        const url = await uploadBlob(nicFrontBlob, `users/${uid}/nic_front_${Date.now()}.jpg`);
        await updateDoc(userDocRef, { nicFrontURL: url });
        toast({ title: 'Uploaded', description: 'NIC front uploaded' });
      }
      if (step === 2 && nicBackBlob) {
        const url = await uploadBlob(nicBackBlob, `users/${uid}/nic_back_${Date.now()}.jpg`);
        await updateDoc(userDocRef, { nicBackURL: url });
        toast({ title: 'Uploaded', description: 'NIC back uploaded' });
      }
      if (step < 3) setStep(s => s + 1);
    } catch (e) {
      console.error(e);
      toast({ title: 'Upload failed', description: 'Failed to upload image', variant: 'destructive' });
    } finally {
      setUploading(false);
      stopCamera();
    }
  };

  const handleScanCompleted = async (data: any) => {
    // When a QR is scanned, keep the parsed data in state and allow the user
    // to explicitly Save or Clear. Do not auto-write to Firestore here.
    try {
      setQrParsed(data);
      toast({ title: 'QR parsed', description: 'Review data then Save to persist' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Parse failed', description: 'Failed to parse QR data', variant: 'destructive' });
    }
  };

  const saveParsedQr = async () => {
    if (!qrParsed) return;
    setUploading(true);
    try {
      const userDocRef = doc(db, 'users', uid);
      const data = qrParsed;
      const payload: any = {
        bankCode: data.bankCode ?? data.bank_code ?? null,
        currencyCode: data.currencyCode ?? data.currency_code ?? null,
        countryCode: data.countryCode ?? data.country_code ?? null,
        merchantId: data.merchantId ?? data.merchant_id ?? null,
        merchantCategoryCode: data.merchantCategoryCode ?? data.mcc ?? null,
        merchantCity: data.merchantCity ?? data.merchant_city ?? null,
        merchantName: data.merchantName ?? data.merchant_name ?? null,
        terminalId: data.terminalId ?? data.terminal_id ?? null,
      };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === null || payload[k] === undefined) delete payload[k];
      });
      if (Object.keys(payload).length > 0) {
        // also lock details when saving parsed QR
        payload.detailsLocked = true;
        await updateDoc(userDocRef, payload);
        if (userProfile?.accountType === 'company' && userProfile.companyId) {
          await syncCompanyMerchantConfig(userProfile.companyId, payload);
        }
      }
      toast({ title: 'QR saved', description: 'LankaQR data saved to profile' });
      setStep(4);
    } catch (e) {
      console.error('saveParsedQr error', e);
      toast({ title: 'Save failed', description: 'Failed to save QR data', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const syncCompanyMerchantConfig = async (companyId: string, config: Record<string, any>) => {
    const res = await fetch('/api/company/merchant-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, config }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      throw new Error(json?.message || 'Failed to update company merchant settings');
    }
  };

  const clearParsedQr = () => {
    setQrParsed(null);
  };

  // maskMerchantId, getBankName, maskEmail provided by helpers

  return (
    <div className="space-y-4 max-w-4xl w-full mx-auto px-4">

      {step === 0 && (
        <ProfileStep
          profilePreview={profilePreview}
          profileBlob={profileBlob}
          profileFileRef={profileFileRef}
          cameraActive={cameraActive}
          videoReady={videoReady}
          videoRefSetter={(el) => { videoRef.current = el; }}
          startCamera={startCamera}
          stopCamera={stopCamera}
          handleFileInput={(e) => handleFileInput(e, setProfilePreview, setProfileBlob)}
          setProfilePreview={setProfilePreview}
          setProfileBlob={setProfileBlob}
          uploading={uploading}
          completeStepUpload={completeStepUpload}
        />
      )}

      {step === 1 && (
        <NicFrontStep
          nicFrontPreview={nicFrontPreview}
          nicFrontBlob={nicFrontBlob}
          cameraActive={cameraActive}
          videoReady={videoReady}
          videoRefSetter={(el) => { videoRef.current = el; }}
          startCamera={startCamera}
          stopCamera={stopCamera}
          setNicFrontPreview={setNicFrontPreview}
          setNicFrontBlob={setNicFrontBlob}
          uploading={uploading}
          completeStepUpload={completeStepUpload}
        />
      )}

      {step === 2 && (
        <NicBackStep
          nicBackPreview={nicBackPreview}
          nicBackBlob={nicBackBlob}
          cameraActive={cameraActive}
          videoReady={videoReady}
          videoRefSetter={(el) => { videoRef.current = el; }}
          startCamera={startCamera}
          stopCamera={stopCamera}
          setNicBackPreview={setNicBackPreview}
          setNicBackBlob={setNicBackBlob}
          uploading={uploading}
          completeStepUpload={completeStepUpload}
        />
      )}

      {step === 3 && (
        <QrStep
          qrParsed={qrParsed}
          handleScanCompleted={handleScanCompleted}
          clearParsedQr={clearParsedQr}
          saveParsedQr={saveParsedQr}
          uploading={uploading}
        />
      )}

      {step === 4 && (
        <CompleteStep
          redirectCountdown={redirectCountdown}
          redirectEmail={redirectEmail}
        />
      )}
    </div>
  );
}

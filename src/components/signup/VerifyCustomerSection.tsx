 'use client'

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { QrUploadSection } from '@/components/profile/QrUploadSection';
import { db, storage } from '@/lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface VerifyCustomerSectionProps {
  uid: string;
  onComplete?: () => void;
}

export default function VerifyCustomerSection({ uid, onComplete }: VerifyCustomerSectionProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [locking, setLocking] = useState(false);

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

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      // show video element first so `videoRef` can be attached
      setCameraActive(true);
      // wait a tick for the video element to mount
      await new Promise((r) => setTimeout(r, 50));

      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = s;
      if (videoRef.current) {
        try {
          videoRef.current.srcObject = s;
          await videoRef.current.play();
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
  };

  const captureFromVideo = async (): Promise<Blob | null> => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    stopCamera();
    return await new Promise<Blob | null>(resolve => canvas.toBlob(b => resolve(b), 'image/jpeg', 0.9));
  };

  // Client-side image processing: optional center-crop to square and compression
  const processImage = async (fileOrBlob: Blob, opts?: { cropToSquare?: boolean; maxSize?: number; quality?: number }): Promise<Blob | null> => {
    const { cropToSquare = false, maxSize = 1024, quality = 0.8 } = opts || {};
    return await new Promise<Blob | null>((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          let sw = img.naturalWidth;
          let sh = img.naturalHeight;

          // If cropToSquare, compute square crop centered
          let sx = 0, sy = 0, sSize = Math.min(sw, sh);
          if (cropToSquare) {
            sx = Math.floor((sw - sSize) / 2);
            sy = Math.floor((sh - sSize) / 2);
          } else {
            sSize = Math.min(sw, sh);
          }

          // Determine output size while respecting maxSize
          const outSize = cropToSquare ? Math.min(sSize, maxSize) : Math.min(Math.max(sw, sh), maxSize);
          const canvas = document.createElement('canvas');
          if (cropToSquare) {
            canvas.width = outSize;
            canvas.height = outSize;
          } else {
            const ratio = Math.min(1, maxSize / Math.max(sw, sh));
            canvas.width = Math.round(sw * ratio);
            canvas.height = Math.round(sh * ratio);
          }
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(null);

          if (cropToSquare) {
            ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, outSize, outSize);
          } else {
            ctx.drawImage(img, 0, 0, sw, sh, 0, 0, canvas.width, canvas.height);
          }

          canvas.toBlob((b) => {
            if (b) resolve(b);
            else resolve(null);
          }, 'image/jpeg', quality);
        } catch (e) {
          console.error('processImage error', e);
          resolve(null);
        }
      };
      img.onerror = (e) => { console.error('image load error', e); resolve(null); };
      const url = URL.createObjectURL(fileOrBlob);
      img.src = url;
    });
  };

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
    const sRef = storageRef(storage, path);
    await uploadBytes(sRef, blob);
    const url = await getDownloadURL(sRef);
    return url;
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
    try {
      setQrParsed(data);
      const userDocRef = doc(db, 'users', uid);
      // Map parsed QR data (which may use snake_case) to the exact camelCase fields required
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
      // Remove undefined/null values so we only write available fields
      Object.keys(payload).forEach((k) => {
        if (payload[k] === null || payload[k] === undefined) delete payload[k];
      });
      if (Object.keys(payload).length > 0) {
        await updateDoc(userDocRef, payload);
      }
      toast({ title: 'QR saved', description: 'LankaQR data saved to profile' });
      setStep(4);
    } catch (e) {
      console.error(e);
      toast({ title: 'Save failed', description: 'Failed to save QR data', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Verify Your Identity</h3>

      {step === 0 && (
        <div>
          <p className="text-sm mb-2">Step 1: Add profile picture (upload or take a picture)</p>
          {profilePreview && <img src={profilePreview} alt="profile" className="max-w-xs rounded mb-2" />}
          <div className="flex gap-2 items-center">
            <input ref={profileFileRef} type="file" accept="image/*" onChange={(e) => handleFileInput(e, setProfilePreview, setProfileBlob)} />
            <Button onClick={startCamera}>Open Camera</Button>
            <Button onClick={() => { 
              setProfilePreview(null); 
              setProfileBlob(null); 
              if (profileFileRef.current) profileFileRef.current.value = '';
            }}>Clear</Button>
          </div>
          <div className="mt-2">
            {cameraActive && (
              <div className="space-y-2">
                <video ref={videoRef} className="w-full max-w-md rounded" playsInline muted autoPlay />
                <div className="flex gap-2">
                  <Button onClick={async () => {
                    const b = await captureFromVideo();
                    if (b) {
                      const processed = await processImage(b, { cropToSquare: true, maxSize: 1024, quality: 0.85 });
                      const final = processed ?? b;
                      const url = URL.createObjectURL(final);
                      setProfilePreview(url);
                      setProfileBlob(final);
                    }
                  }}>Capture</Button>
                  <Button variant="outline" onClick={stopCamera}>Close Camera</Button>
                </div>
              </div>
            )}
          </div>
          <div className="mt-3">
            <Button onClick={completeStepUpload} disabled={!profileBlob || uploading}>{uploading ? 'Uploading...' : 'Save and Continue'}</Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <p className="text-sm mb-2">Step 2: Capture NIC (Front). Camera only.</p>
          {nicFrontPreview && <img src={nicFrontPreview} alt="nic front" className="max-w-xs rounded mb-2" />}
          <div className="flex gap-2 items-center">
            {!cameraActive ? (
              <Button onClick={startCamera}>Open Camera</Button>
            ) : (
              <>
                <Button onClick={async () => {
                  const b = await captureFromVideo();
                  if (b) {
                    const processed = await processImage(b, { cropToSquare: false, maxSize: 1280, quality: 0.85 });
                    const final = processed ?? b;
                    const url = URL.createObjectURL(final);
                    setNicFrontPreview(url);
                    setNicFrontBlob(final);
                  }
                }}>Capture</Button>
                <Button variant="outline" onClick={stopCamera}>Close Camera</Button>
              </>
            )}
            <Button onClick={() => { setNicFrontPreview(null); setNicFrontBlob(null); }}>Clear</Button>
          </div>
          <div className="mt-3">
            <Button onClick={completeStepUpload} disabled={!nicFrontBlob || uploading}>{uploading ? 'Uploading...' : 'Save and Continue'}</Button>
          </div>
          <div className="mt-2">
            {cameraActive && <video ref={videoRef} className="w-full max-w-md rounded" playsInline muted autoPlay />}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <p className="text-sm mb-2">Step 3: Capture NIC (Back). Camera only.</p>
          {nicBackPreview && <img src={nicBackPreview} alt="nic back" className="max-w-xs rounded mb-2" />}
          <div className="flex gap-2 items-center">
            {!cameraActive ? (
              <Button onClick={startCamera}>Open Camera</Button>
            ) : (
              <>
                <Button onClick={async () => {
                  const b = await captureFromVideo();
                  if (b) {
                    const processed = await processImage(b, { cropToSquare: false, maxSize: 1280, quality: 0.85 });
                    const final = processed ?? b;
                    const url = URL.createObjectURL(final);
                    setNicBackPreview(url);
                    setNicBackBlob(final);
                  }
                }}>Capture</Button>
                <Button variant="outline" onClick={stopCamera}>Close Camera</Button>
              </>
            )}
            <Button onClick={() => { setNicBackPreview(null); setNicBackBlob(null); }}>Clear</Button>
          </div>
          <div className="mt-3">
            <Button onClick={completeStepUpload} disabled={!nicBackBlob || uploading}>{uploading ? 'Uploading...' : 'Save and Continue'}</Button>
          </div>
          <div className="mt-2">
            {cameraActive && <video ref={videoRef} className="w-full max-w-md rounded" playsInline muted autoPlay />}
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <p className="text-sm mb-2">Step 4: Scan LankaQR to associate merchant details.</p>
          <QrUploadSection onScanned={handleScanCompleted} />
        </div>
      )}

      {step === 4 && (
        <div className="space-y-2">
          <p className="text-sm">All steps completed.</p>
          <div className="flex gap-2">
            <Button onClick={async () => {
              setLocking(true);
              try {
                const userDocRef = doc(db, 'users', uid);
                await updateDoc(userDocRef, { detailsLocked: true });
                toast({ title: 'Saved', description: 'Details locked' });
                try { router.push('/generate-qr'); } catch (e) { /* ignore */ }
              } catch (e) {
                console.error('lock details error', e);
                toast({ title: 'Error', description: 'Failed to lock details', variant: 'destructive' });
              } finally {
                setLocking(false);
              }
            }} disabled={locking}>{locking ? 'Processing...' : 'Continue'}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

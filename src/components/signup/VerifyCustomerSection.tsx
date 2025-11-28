 'use client'

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { QrUploadSection } from '@/components/profile/QrUploadSection';
import { db, storage } from '@/lib/firebase';
import { bankCodeItems } from '@/lib/bankCodes';
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
  const [videoReady, setVideoReady] = useState(false);

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
        await updateDoc(userDocRef, payload);
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

  const clearParsedQr = () => {
    setQrParsed(null);
  };

  const maskMerchantId = (id?: string | null) => {
    if (!id) return '';
    const s = String(id);
    if (s.length <= 8) return s;
    const first = s.slice(0, 4);
    const last = s.slice(-4);
    const middle = '*'.repeat(Math.max(0, s.length - 8));
    return `${first}${middle}${last}`;
  };

  const getBankName = (code?: string | number | null) => {
    if (!code && code !== 0) return '';
    const c = String(code);
    const found = bankCodeItems.find(b => b.value === c);
    return found ? found.label : c;
  };

  return (
    <div className="space-y-4 max-w-4xl w-full mx-auto px-4">

      {step === 0 && (
        <div className="relative pb-16 flex flex-col items-center text-center">
          <p className="text-lg mb-4 text-center">Add profile picture (upload or take a picture)</p>
          <div className="flex justify-center mb-3">
            <div className="relative w-96 h-96">
              <img
                src={profilePreview ?? 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="224" height="224" viewBox="0 0 24 24" fill="none" stroke="%23888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3"/><path d="M20.5 21a8.38 8.38 0 0 0-17 0"/></svg>'}
                alt="profile"
                className={`absolute inset-0 w-full h-full rounded-full object-cover border-2 transition-all duration-500 ease-in-out ${cameraActive ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
              />
              <div className={`absolute inset-0 rounded-full overflow-hidden border-2 transition-all duration-500 ease-in-out ${videoReady ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
              </div>
              {cameraActive && !videoReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 items-center justify-center">
            {!cameraActive && !profilePreview && !profileBlob && (
              <>
                <input
                  ref={profileFileRef}
                  type="file"
                  accept="image/*"
                  className="text-sm file:py-2 file:px-4 file:bg-indigo-600 file:text-white file:rounded file:border-0 file:mr-2 file:cursor-pointer"
                  onChange={(e) => handleFileInput(e, setProfilePreview, setProfileBlob)}
                />
                <Button size='sm' onClick={startCamera}>Open Camera</Button>
              </>
            )}
            {cameraActive && (
              <>
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
              </>
            )}
          </div>
          <div className="flex gap-2 absolute right-0 bottom-0">
            {profilePreview && profileBlob && (
              <Button
                variant='destructive'
                size='sm'
                onClick={() => { 
                  if (profilePreview) URL.revokeObjectURL(profilePreview);
                  setProfilePreview(null); 
                  setProfileBlob(null); 
                  if (profileFileRef.current) profileFileRef.current.value = '';
                }}
              >
                Clear
              </Button>
            )}

            <Button
              onClick={completeStepUpload}
              disabled={!profileBlob || uploading}
              size='sm'
            >
              {uploading ? 'Uploading...' : 'Save and Continue'}
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="relative pb-16 flex flex-col items-center text-center">
          <p className="text-lg mb-4 text-center">Capture NIC (Front). Camera only.</p>
          <div className="flex justify-center mb-3">
            <div className="relative w-96 h-72">
              <img
                src={nicFrontPreview ?? 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="384" height="288" viewBox="0 0 24 24" fill="none" stroke="%23888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><circle cx="8" cy="9" r="2"/><path d="M21 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/></svg>'}
                alt="nic front"
                className={`absolute inset-0 w-full h-full object-cover rounded transition-all duration-500 ease-in-out ${cameraActive ? 'opacity-0 scale-95' : (nicFrontPreview ? 'opacity-100 scale-100' : 'opacity-100')}`}
              />
              <div className={`absolute inset-0 rounded overflow-hidden transition-all duration-500 ease-in-out ${videoReady ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
              </div>
              {cameraActive && !videoReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 items-center justify-center">
            {!cameraActive && !nicFrontPreview && !nicFrontBlob && (
              <Button size='sm' onClick={startCamera}>Open Camera</Button>
            )}
            {cameraActive && (
              <>
                <Button
                  size='sm'
                  onClick={async () => {
                    const b = await captureFromVideo();
                    if (b) {
                      const processed = await processImage(b, { cropToSquare: false, maxSize: 1280, quality: 0.85 });
                      const final = processed ?? b;
                      const url = URL.createObjectURL(final);
                      setNicFrontPreview(url);
                      setNicFrontBlob(final);
                    }
                }}>Capture</Button>
                <Button size='sm' variant="outline" onClick={stopCamera}>Close Camera</Button>
              </>
            )}
          </div>
          <div className="flex gap-2 absolute right-0 bottom-0">
            {nicFrontPreview && nicFrontBlob && (
              <Button
                variant='destructive'
                size='sm'
                onClick={() => {
                  if (nicFrontPreview) URL.revokeObjectURL(nicFrontPreview);
                  setNicFrontPreview(null); setNicFrontBlob(null);
                }}
              >
                Clear
              </Button>
            )}

            <Button
              size='sm'
              onClick={completeStepUpload}
              disabled={!nicFrontBlob || uploading}
            >
              {uploading ? 'Uploading...' : 'Save and Continue'}
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="relative pb-16 flex flex-col items-center text-center">
          <p className="text-lg mb-4 text-center">Capture NIC (Back). Camera only.</p>
          <div className="flex justify-center mb-3">
            <div className="relative w-96 h-72">
              <img
                src={nicBackPreview ?? 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="384" height="288" viewBox="0 0 24 24" fill="none" stroke="%23888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><path d="M3 7h18"/></svg>'}
                alt="nic back"
                className={`absolute inset-0 w-full h-full object-cover rounded transition-all duration-500 ease-in-out ${cameraActive ? 'opacity-0 scale-95' : (nicBackPreview ? 'opacity-100 scale-100' : 'opacity-100')}`}
              />
              <div className={`absolute inset-0 rounded overflow-hidden transition-all duration-500 ease-in-out ${videoReady ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
              </div>
              {cameraActive && !videoReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 items-center justify-center">
            {!cameraActive && !nicBackPreview && !nicBackBlob && (
              <Button size='sm' onClick={startCamera}>Open Camera</Button>
            )}
            {cameraActive && (
              <>
                <Button
                  size='sm'
                  onClick={async () => {
                    const b = await captureFromVideo();
                    if (b) {
                      const processed = await processImage(b, { cropToSquare: false, maxSize: 1280, quality: 0.85 });
                      const final = processed ?? b;
                      const url = URL.createObjectURL(final);
                      setNicBackPreview(url);
                      setNicBackBlob(final);
                    }
                }}>Capture</Button>
                <Button size='sm' variant="outline" onClick={stopCamera}>Close Camera</Button>
              </>
            )}
          </div>
          <div className="flex gap-2 absolute right-0 bottom-0">
            {nicBackPreview && nicBackBlob && (
              <Button
                variant='destructive'
                size='sm'
                onClick={() => {
                  if (nicBackPreview) URL.revokeObjectURL(nicBackPreview);
                  setNicBackPreview(null); setNicBackBlob(null);
                }}
              >
                Clear
              </Button>
            )}

            <Button
              size='sm'
              onClick={completeStepUpload}
              disabled={!nicBackBlob || uploading}
            >
              {uploading ? 'Uploading...' : 'Save and Continue'}
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className='relative pb-16 flex flex-col items-center text-center'>
          <p className="text-lg mb-4 text-center">Scan LankaQR to associate merchant details.</p>
          <div className='flex justify-center mb-3'>
            <div className="relative w-96 h-96">
              {qrParsed ? (
                <div className="absolute inset-0 p-4 bg-white rounded border flex flex-col justify-start items-stretch text-left text-sm space-y-3 overflow-auto">
                  <div className="w-full text-center">
                    <div className="text-3xl font-bold my-8">{qrParsed.merchantName ?? qrParsed.merchant_name ?? 'Merchant'}</div>
                  </div>
                  <div className="w-full">
                    <div className="grid grid-cols-[auto_auto_1fr] gap-x-4 gap-y-2 items-center text-sm text-gray-600">
                      <div className="text-left pr-2">Merchant ID</div>
                      <div className="text-center">:</div>
                      <div className="font-mono text-lg text-gray-800">{maskMerchantId(qrParsed.merchantId ?? qrParsed.merchant_id ?? '')}</div>

                      <div className="text-left pr-2">City</div>
                      <div className="text-center">:</div>
                      <div className="font-mono text-lg text-gray-800">{qrParsed.merchantCity ?? qrParsed.merchant_city ?? ''}</div>

                      <div className="text-left pr-2">Bank</div>
                      <div className="text-center">:</div>
                      <div className="font-mono text-lg text-gray-800">{getBankName(qrParsed.bankCode ?? qrParsed.bank_code ?? '')}</div>

                      <div className="text-left pr-2">Currency</div>
                      <div className="text-center">:</div>
                      <div className="font-mono text-lg text-gray-800">{qrParsed.currencyCode ?? qrParsed.currency_code ?? ''}</div>

                      <div className="text-left pr-2">Terminal</div>
                      <div className="text-center">:</div>
                      <div className="font-mono text-lg text-gray-800">{qrParsed.terminalId ?? qrParsed.terminal_id ?? ''}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <img
                  src={'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="224" height="224" viewBox="0 0 24 24" fill="%23fff"><rect width="24" height="24" fill="%23fff"/><rect x="1" y="1" width="6" height="6" fill="%23000"/><rect x="17" y="1" width="6" height="6" fill="%23000"/><rect x="1" y="17" width="6" height="6" fill="%23000"/><rect x="9" y="3" width="2" height="2" fill="%23000"/><rect x="12" y="3" width="2" height="2" fill="%23000"/><rect x="9" y="6" width="2" height="2" fill="%23000"/><rect x="6" y="9" width="2" height="2" fill="%23000"/><rect x="3" y="12" width="2" height="2" fill="%23000"/><rect x="9" y="12" width="2" height="2" fill="%23000"/><rect x="12" y="9" width="2" height="2" fill="%23000"/><rect x="15" y="12" width="2" height="2" fill="%23000"/><rect x="12" y="15" width="2" height="2" fill="%23000"/><rect x="18" y="9" width="2" height="2" fill="%23000"/></svg>'}
                  alt="qr placeholder"
                  className="absolute inset-0 w-full h-full object-cover rounded transition-all duration-500 ease-in-out opacity-100"
                />
              )}
            </div>
          </div>
          {!qrParsed && (
            <div className='flex justify-center'>
              <QrUploadSection onScanned={handleScanCompleted} />
            </div>
          )}
          <div className="flex gap-2 absolute right-0 bottom-0">
            {qrParsed && (
              <Button
                variant='destructive'
                size='sm'
                onClick={clearParsedQr}
              >
                Clear
              </Button>
            )}

            <Button
              size='sm'
              onClick={saveParsedQr}
              disabled={!qrParsed || uploading}
            >
              {uploading ? 'Saving...' : 'Save and Continue'}
            </Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="relative pb-16 flex flex-col items-center text-center">
          <p className="text-lg mb-4 text-center">All steps completed.</p>
          <div className="flex justify-center mb-3">
            <div className="w-36 h-36">
              <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className="w-full h-full rounded-full">
                <rect width="64" height="64" rx="32" fill="#10B981" />
                <path d="M45 23.5c0 .8-.3 1.6-.9 2.2L30.6 39.3c-.6.6-1.6.6-2.2 0L20.9 31.8c-.6-.6-.6-1.6 0-2.2.6-.6 1.6-.6 2.2 0l6.1 6.1L42.5 23.5c.6-.6 1.6-.6 2.2 0 .6.6.6 1.6 0 2.2z" fill="#fff" />
              </svg>
            </div>
          </div>
          <div className="flex gap-2 absolute right-0 bottom-0">
            <Button
              disabled={locking}
              onClick={async () => {
                setLocking(true);
                try {
                  const userDocRef = doc(db, 'users', uid);
                  await updateDoc(userDocRef, { detailsLocked: true });
                  toast({ title: 'Saved', description: 'Details locked' });
                  try { router.push('/signin'); } catch (e) { /* ignore */ }
                } catch (e) {
                  console.error('lock details error', e);
                  toast({ title: 'Error', description: 'Failed to lock details', variant: 'destructive' });
                } finally {
                  setLocking(false);
                }
              }}
            >
              {locking ? 'Processing...' : 'Continue'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { processImage, captureFromVideoElement } from '@/lib/verificationHelpers';

interface Props {
  profilePreview: string | null;
  profileBlob: Blob | null;
  profileFileRef: React.RefObject<HTMLInputElement | null>;
  cameraActive: boolean;
  videoReady: boolean;
  videoRefSetter: (el: HTMLVideoElement | null) => void;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  handleFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setProfilePreview: (s: string | null) => void;
  setProfileBlob: (b: Blob | null) => void;
  uploading: boolean;
  completeStepUpload: () => Promise<void>;
}

export default function ProfileStep(props: Props) {
  const {
    profilePreview,
    profileBlob,
    profileFileRef,
    cameraActive,
    videoReady,
    videoRefSetter,
    startCamera,
    stopCamera,
    handleFileInput,
    setProfilePreview,
    setProfileBlob,
    uploading,
    completeStepUpload,
  } = props;

  const [localVideoEl, setLocalVideoEl] = useState<HTMLVideoElement | null>(null);

  return (
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
            <video ref={(el) => { setLocalVideoEl(el); videoRefSetter(el); }} className="w-full h-full object-cover" playsInline muted autoPlay />
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
              ref={profileFileRef as any}
              type="file"
              accept="image/*"
              className="text-sm file:py-2 file:px-4 file:bg-indigo-600 file:text-white file:rounded file:border-0 file:mr-2 file:cursor-pointer"
              onChange={(e) => handleFileInput(e)}
            />
            <Button size='sm' onClick={startCamera}>Open Camera</Button>
          </>
        )}
        {cameraActive && (
          <>
            <Button onClick={async () => {
              if (!localVideoEl) return;
              const b = await captureFromVideoElement(localVideoEl);
              if (b) {
                const processed = await processImage(b, { cropToSquare: true, maxSize: 1024, quality: 0.85 });
                const final = processed ?? b;
                const url = URL.createObjectURL(final);
                setProfilePreview(url);
                setProfileBlob(final);
                // Show the captured preview immediately by stopping the camera
                stopCamera();
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
  );
}

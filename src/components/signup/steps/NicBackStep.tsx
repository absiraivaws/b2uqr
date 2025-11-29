"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { processImage, captureFromVideoElement } from '@/lib/verificationHelpers';

interface Props {
  nicBackPreview: string | null;
  nicBackBlob: Blob | null;
  cameraActive: boolean;
  videoReady: boolean;
  videoRefSetter: (el: HTMLVideoElement | null) => void;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  setNicBackPreview: (s: string | null) => void;
  setNicBackBlob: (b: Blob | null) => void;
  uploading: boolean;
  completeStepUpload: () => Promise<void>;
}

export default function NicBackStep(props: Props) {
  const {
    nicBackPreview,
    nicBackBlob,
    cameraActive,
    videoReady,
    videoRefSetter,
    startCamera,
    stopCamera,
    setNicBackPreview,
    setNicBackBlob,
    uploading,
    completeStepUpload,
  } = props;

  const [localVideoEl, setLocalVideoEl] = useState<HTMLVideoElement | null>(null);

  return (
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
            <video ref={(el) => { setLocalVideoEl(el); videoRefSetter(el); }} className="w-full h-full object-cover" playsInline muted autoPlay />
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
                if (!localVideoEl) return;
                const b = await captureFromVideoElement(localVideoEl);
                if (b) {
                  const processed = await processImage(b, { cropToSquare: false, maxSize: 1280, quality: 0.85 });
                  const final = processed ?? b;
                  const url = URL.createObjectURL(final);
                  setNicBackPreview(url);
                  setNicBackBlob(final);
                  // Stop camera so the preview image is shown immediately
                  stopCamera();
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
  );
}

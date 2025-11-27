'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Camera, X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { parseLankaQR, LankaQRData, validateLankaQRFormat } from '@/lib/qr-parser';
import { MerchantDetailsHandle } from './MerchantDetailsSection';
import { useToast } from '@/hooks/use-toast';

interface QrUploadSectionProps {
  merchantRef?: React.RefObject<MerchantDetailsHandle>;
  onScanned?: (data: LankaQRData) => void;
}

export function QrUploadSection({ merchantRef, onScanned }: QrUploadSectionProps) {
  const { toast } = useToast();
  const [qrData, setQrData] = useState<LankaQRData | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Stop camera when QR data is successfully extracted
  useEffect(() => {
    if (qrData && isCameraActive) {
      stopCameraScan();
    }
  }, [qrData, isCameraActive]);

  // Populate merchant details when QR data is extracted
  useEffect(() => {
    if (qrData && merchantRef?.current) {
      const isLocked = merchantRef.current.isLocked();
      if (!isLocked) {
        merchantRef.current.populateFromQR({
          merchant_id: qrData.merchant_id,
          bank_code: qrData.bank_code,
          terminal_id: qrData.terminal_id,
          merchant_name: qrData.merchant_name,
          merchant_city: qrData.merchant_city,
          mcc: qrData.mcc,
          currency_code: qrData.currency_code,
          country_code: qrData.country_code,
        });
      }
    }
  }, [qrData, merchantRef]);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current && isCameraActive) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [isCameraActive]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setQrData(null);

    if (!file.type.startsWith('image/')) {
      toast({ 
        title: 'Invalid file type', 
        description: 'Please upload a valid image file (PNG, JPG, JPEG)',
        variant: 'destructive'
      });
      return;
    }

    try {
      const html5QrCode = new Html5Qrcode('qr-reader-hidden');
      const qrCodeString = await html5QrCode.scanFile(file, false);

      if (!validateLankaQRFormat(qrCodeString)) {
        toast({ 
          title: 'Invalid QR format', 
          description: 'Please upload a valid LankaQR code.',
          variant: 'destructive'
        });
        return;
      }

      const parsed = parseLankaQR(qrCodeString);
      if (parsed) {
        setQrData(parsed);
        if (typeof onScanned === 'function') onScanned(parsed);
        toast({ 
          title: 'Success', 
          description: 'QR code scanned successfully!'
        });
      } else {
        toast({ 
          title: 'Parse failed', 
          description: 'Failed to parse QR code data. Please check the QR code format.',
          variant: 'destructive'
        });
      }
    } catch (err) {
      console.error('QR scan error:', err);
      toast({ 
        title: 'Scan failed', 
        description: 'Failed to scan QR code. Please ensure the image contains a valid QR code.',
        variant: 'destructive'
      });
    }
  };

  const startCameraScan = async () => {
    setQrData(null);
    setIsScanning(true); // Set this first to render the div

    // Wait for the DOM to update
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Success callback
          if (!validateLankaQRFormat(decodedText)) {
            toast({ 
              title: 'Invalid QR format', 
              description: 'Invalid LankaQR format detected.',
              variant: 'destructive'
            });
            return;
          }

          const parsed = parseLankaQR(decodedText);
          if (parsed) {
            setQrData(parsed);
            if (typeof onScanned === 'function') onScanned(parsed);
            toast({ 
              title: 'Success', 
              description: 'QR code scanned successfully from camera!'
            });
            stopCameraScan();
          } else {
            toast({ 
              title: 'Parse failed', 
              description: 'Failed to parse QR code data.',
              variant: 'destructive'
            });
          }
        },
        (errorMessage) => {
          // Error callback (scanning in progress, not a real error)
        }
      );

      setIsCameraActive(true);
    } catch (err) {
      console.error('Camera error:', err);
      toast({ 
        title: 'Camera error', 
        description: 'Failed to access camera. Please ensure camera permissions are granted.',
        variant: 'destructive'
      });
      setIsScanning(false);
    }
  };

  const stopCameraScan = async () => {
    if (scannerRef.current && isCameraActive) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        setIsCameraActive(false);
        setIsScanning(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const clearData = () => {
    setQrData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  return (

    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpg,image/jpeg"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Hidden div for file scanning */}
      <div id="qr-reader-hidden" style={{ display: 'none' }} />

      {/* Action Buttons */}
      {!isScanning && (
        <div className="flex gap-3 flex-wrap">
          <Button onClick={handleUploadClick} className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload QR
          </Button>
          <Button
            onClick={startCameraScan}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Camera className="h-4 w-4" />
            Scan with Camera
          </Button>
        </div>
      )}

      {/* Camera Scanner */}
      {isScanning && (
        <div className="space-y-3">
          <div id="qr-reader" className="rounded-lg overflow-hidden border max-w-md mx-auto" />
          <Button
            onClick={stopCameraScan}
            variant="destructive"
            className="w-full flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Stop Scanning
          </Button>
        </div>
      )}

    </div>
  );
}

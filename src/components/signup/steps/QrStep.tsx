"use client"

import React from 'react';
import { Button } from '@/components/ui/button';
import { QrUploadSection } from '@/components/profile/QrUploadSection';
import { maskMerchantId, getBankName } from '@/lib/verificationHelpers';

interface Props {
  qrParsed: any | null;
  handleScanCompleted: (data: any) => Promise<void> | void;
  clearParsedQr: () => void;
  saveParsedQr: () => Promise<void> | void;
  uploading: boolean;
}

export default function QrStep(props: Props) {
  const { qrParsed, handleScanCompleted, clearParsedQr, saveParsedQr, uploading } = props;

  return (
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
  );
}

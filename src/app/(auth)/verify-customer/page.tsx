import React, { Suspense } from 'react';
import VerifyCustomerClientWrapper from '@/components/auth/VerifyCustomerClientWrapper';

export default function VerifyCustomerPage() {
  return (
    <main className="p-4 sm:p-6 lg:p-8 min-h-screen flex items-center justify-center">
      <div className="w-full max-w-4xl">
        <Suspense fallback={<div className="min-h-[200px]" />}> 
          <VerifyCustomerClientWrapper />
        </Suspense>
      </div>
    </main>
  );
}

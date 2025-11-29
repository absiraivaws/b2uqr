"use client"

import React from 'react';
import { maskEmail } from '@/lib/verificationHelpers';

interface Props {
  redirectCountdown: number;
  redirectEmail: string | null;
}

export default function CompleteStep({ redirectCountdown, redirectEmail }: Props) {
  return (
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
      <p className="text-sm text-gray-600 mb-2">
        Redirecting to sign-in in <span className="font-medium">{redirectCountdown}</span>s
      </p>
      {redirectEmail && (
        <p className="text-sm text-gray-700 mb-4">
          Autofill email: <span className="font-mono text-sm text-gray-800">{maskEmail(redirectEmail)}</span>
        </p>
      )}
    </div>
  );
}

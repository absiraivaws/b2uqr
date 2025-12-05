"use client"

import React from 'react';
import { CheckCircle } from 'lucide-react';
import { maskEmail } from '@/lib/verificationHelpers';

interface Props {
  redirectCountdown: number;
  redirectEmail: string | null;
}

export default function CompleteStep({ redirectCountdown, redirectEmail }: Props) {
  return (
    <div className="relative flex flex-col items-center text-center gap-4 rounded-2xl border border-border/60 bg-gradient-to-b from-background to-muted/40 px-6 py-10 shadow-md">
      <p className="text-xl font-semibold text-foreground">All steps completed</p>

      <div className="flex justify-center">
        <div className="w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center rounded-3xl bg-white border border-green-100 shadow-lg">
          <div className="w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center rounded-full bg-green-50 text-green-500">
            <CheckCircle className="h-16 w-16 sm:h-20 sm:w-20" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      <p className="text-base sm:text-lg text-muted-foreground">
        Redirecting to sign-in in {' '}
        <span className="text-3xl font-bold text-foreground">{redirectCountdown}</span>
        <span className="ml-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">sec</span>
      </p>

      {redirectEmail && (
        <p className="text-sm sm:text-base text-muted-foreground">
          Autofill email: <span className="font-mono text-base text-foreground">{maskEmail(redirectEmail)}</span>
        </p>
      )}
    </div>
  );
}

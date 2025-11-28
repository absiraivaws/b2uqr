 'use client'
import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import VerifyCustomerSection from '@/components/signup/VerifyCustomerSection';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function VerifyCustomerPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const uid = searchParams.get('uid');

  if (!uid) {
    return (
      <main className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Verification</CardTitle>
            <CardDescription>Missing user id for verification.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm">No user identifier provided. Please sign up first.</p>
              <div className="flex gap-2">
                <Button onClick={() => router.push('/signup')}>Go to Sign up</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8 min-h-screen flex items-center justify-center">
      <div className="w-full max-w-4xl">
        <Card>
        <CardHeader>
          <CardTitle>Verify Your Identity</CardTitle>
          <CardDescription>Complete the verification steps to finish registration.</CardDescription>
        </CardHeader>
        <CardContent>
          <VerifyCustomerSection uid={uid} onComplete={() => { try { router.push('/generate-qr'); } catch (e) {} }} />
        </CardContent>
        </Card>
      </div>
    </main>
  );
}

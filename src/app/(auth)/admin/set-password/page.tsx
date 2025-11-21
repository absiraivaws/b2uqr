import React, { Suspense } from 'react';
import SetPasswordForm from '@/components/admin/SetPasswordForm';

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <SetPasswordForm />
    </Suspense>
  );
}

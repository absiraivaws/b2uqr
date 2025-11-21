import React, { Suspense } from 'react';
import StaffSetPasswordForm from '@/components/staff/SetPasswordForm';

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <StaffSetPasswordForm />
    </Suspense>
  );
}

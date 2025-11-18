"use client";
import React from 'react';
import { Button } from '@/components/ui/button';

export default function SignOutButton() {
  const [loading, setLoading] = React.useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      await fetch('/api/admin/signout', { method: 'POST', credentials: 'same-origin' });
    } catch (err) {
      console.error('signout failed', err);
    } finally {
      // always redirect to signin
      window.location.href = '/admin/signin';
    }
  }

  return (
    <Button variant="ghost" onClick={handleSignOut} disabled={loading}>
      Sign out
    </Button>
  );
}

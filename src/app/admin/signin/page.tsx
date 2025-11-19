"use client"

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function AdminSignInPage() {
  const { toast } = useToast();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !password) {
      toast({ title: 'Missing', description: 'Email and password are required' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/signin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!data?.ok) {
        toast({ title: 'Sign in failed', description: data?.message || 'Invalid credentials' });
        return;
      }
      // Signed in — cookie set by server. Redirect to admin area.
      router.push('/admin');
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Server error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-lg font-semibold mb-4">Admin sign in</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <Button type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</Button>
        </div>
      </form>
    </div>
  );
}

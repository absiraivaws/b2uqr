"use client"

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SetPasswordPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const token = params?.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      toast({ title: 'Missing token', description: 'No token provided in URL' });
    }
  }, [token]);

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!token) return;
    if (password.length < 8) {
      toast({ title: 'Password', description: 'Password must be at least 8 characters' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Password', description: 'Passwords do not match' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/set-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) });
      const data = await res.json();
      if (!data?.ok) {
        toast({ title: 'Error', description: data?.message || 'Failed to set password' });
        return;
      }
      toast({ title: 'Password set', description: 'You can now sign in as admin.' });
      router.push('/admin/signin');
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Server error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-lg font-semibold mb-4">Set admin password</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="confirm">Confirm password</Label>
          <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <div>
          <Button type="submit" disabled={loading}>{loading ? 'Setting...' : 'Set password'}</Button>
        </div>
      </form>
    </div>
  );
}

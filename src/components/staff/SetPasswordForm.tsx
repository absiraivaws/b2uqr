"use client"

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Loader2 } from 'lucide-react';

export default function StaffSetPasswordForm() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const token = params?.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Missing token in URL');
      toast({ title: 'Missing token', description: 'No token provided in URL' });
    }
  }, [token]);

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!token) return;
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      toast({ title: 'Password', description: 'Password must be at least 8 characters' });
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      toast({ title: 'Password', description: 'Passwords do not match' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/staff/set-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) });
      const data = await res.json();
      if (!data?.ok) {
        setError(data?.message || 'Failed to set password');
        toast({ title: 'Error', description: data?.message || 'Failed to set password' });
        return;
      }
      toast({ title: 'Password set', description: 'You can now sign in as staff.' });
      router.push('/staff/signin');
    } catch (err) {
      console.error(err);
      setError('Server error');
      toast({ title: 'Error', description: 'Server error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto md:min-h-screen md:flex md:flex-col md:justify-center">
      <Card>
        <CardHeader>
          <CardTitle>Set staff password</CardTitle>
          <CardDescription>Set a password for your staff account using the invite link.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex gap-2 flex-col">
              <Input placeholder="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <Input placeholder="Confirm password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
          </div>

          <Separator />

          <div>
            <Button onClick={() => onSubmit()} disabled={loading} className='w-full'>
              {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Set password'}
            </Button>
          </div>

        </CardContent>
      </Card>
    </main>
  );
}

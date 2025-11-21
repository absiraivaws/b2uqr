"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function StaffSignInPage() {
  const { toast } = useToast();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Email and password are required.');
      toast({ title: 'Missing', description: 'Email and password are required' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/staff/signin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!data?.ok) {
        setError(data?.message || 'Invalid credentials');
        toast({ title: 'Sign in failed', description: data?.message || 'Invalid credentials' });
        return;
      }
      router.push('/staff');
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
          <CardTitle>Staff sign in</CardTitle>
          <CardDescription>Sign in to your staff account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Staff credentials</h3>
            </div>
            <div className="flex gap-4 flex-col">
              <Input placeholder="staff@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              <Input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          </div>

          <Separator />

          <div>
            <Button onClick={() => onSubmit()} disabled={loading} className='w-full'>
              {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Sign in'}
            </Button>
          </div>

        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground mt-4">
        Need help? <Button variant="link" className="p-0" onClick={() => router.push('/staff/reset-password')}>Reset password</Button>
      </p>
    </main>
  );
}

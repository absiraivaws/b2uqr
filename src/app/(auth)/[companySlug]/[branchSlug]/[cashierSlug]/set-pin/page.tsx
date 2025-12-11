"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from 'lucide-react';

export default function CashierSetPinPage() {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const search = useSearchParams();
  const token = search?.get('token') || '';
  const router = useRouter();
  const params = useParams() as { companySlug?: string; branchSlug?: string; cashierSlug?: string };

  useEffect(() => {
    setError(null);
    setSuccess(false);
  }, [token]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setSuccess(false);
    if (!token) {
      setError('Missing invite token');
      return;
    }
    if (!/^[0-9]{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits.');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/cashier/set-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, pin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setError(data?.message || 'Failed to set PIN');
        setLoading(false);
        return;
      }
      setSuccess(true);
      setPin('');
      setConfirmPin('');

      const company = params?.companySlug || '';
      const branch = params?.branchSlug || '';
      const cashier = params?.cashierSlug || '';
      const dest = company && branch && cashier ? `/${company}/${branch}/${cashier}` : '/generate-qr';
      setTimeout(() => router.push(dest), 900);
    } catch (err) {
      console.error(err);
      setError('Failed to set PIN. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto md:min-h-screen md:flex md:flex-col md:justify-center">
      <Card>
        <CardHeader>
          <CardTitle>Set cashier PIN</CardTitle>
          <CardDescription>Set a 4-digit PIN for your cashier account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm">New 4-digit PIN</label>
              <Input value={pin} onChange={(e: any) => setPin((e.target.value || '').replace(/\D/g, '').slice(0, 4))} placeholder="1234" />
            </div>

            <div className="space-y-2">
              <label className="text-sm">Confirm PIN</label>
              <Input value={confirmPin} onChange={(e: any) => setConfirmPin((e.target.value || '').replace(/\D/g, '').slice(0, 4))} placeholder="1234" />
            </div>

            {success && <div className="text-green-600 text-sm">PIN set successfully! Redirecting…</div>}

            <div>
              <Button onClick={handleSubmit} className="w-full" disabled={loading}>
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Set PIN'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

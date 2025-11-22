"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

type AdminForm = {
  name: string;
  email: string;
  nic: string;
  phone: string;
  position: string;
};

type Props = {
  onSuccess?: () => void;
};

export default function AddAdminForm({ onSuccess }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState<AdminForm>({ name: '', email: '', nic: '', phone: '', position: '' });
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const successRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<number | null>(null);

  const onChange = (k: keyof AdminForm, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const validate = (f: AdminForm) => {
    if (!f.name.trim()) return 'Name is required';
    if (!f.email.trim()) return 'Email is required';
    // simple email check
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) return 'Enter a valid email';
    if (!f.nic.trim()) return 'NIC is required';
    if (!f.phone.trim()) return 'Phone is required';
    if (!f.position.trim()) return 'Position is required';
    return null;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const err = validate(form);
    if (err) {
      toast({ title: 'Validation', description: err });
      return;
    }
    setLoading(true);
      try {
      const adminsCol = collection(db, 'admins');
      await addDoc(adminsCol, {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        nic: form.nic.trim(),
        phone: form.phone.trim(),
        position: form.position.trim(),
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Admin added', description: `${form.name} has been added to admins.` });
      setForm({ name: '', email: '', nic: '', phone: '', position: '' });

      // show brief success animation and move focus to it, then close the modal
      setIsSuccess(true);
      // focus the success message for accessibility
      window.setTimeout(() => successRef.current?.focus(), 50);
      // schedule close after a short delay so user sees the success state
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
      closeTimer.current = window.setTimeout(() => {
        try {
          if (typeof onSuccess === 'function') onSuccess();
        } catch (e) {
          // ignore
        }
        setIsSuccess(false);
      }, 900) as unknown as number;
      // Create invite and send set-password email
      try {
        await fetch('/api/admin/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email.trim().toLowerCase(), name: form.name.trim() }),
        });
      } catch (err) {
        console.warn('Failed to create invite', err);
      }
      } catch (err) {
      console.error('Failed to add admin', err);
      toast({ title: 'Failed', description: 'Could not add admin — try again.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {isSuccess && (
        <div
          ref={successRef}
          tabIndex={-1}
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 p-4 rounded-md bg-green-50 text-green-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <div className="font-medium">Added</div>
          <div className="text-sm text-green-700/80">Admin has been added successfully.</div>
        </div>
      )}
      <div className="flex flex-col gap-6 px-8">
        <div className='space-y-2'>
          <Label htmlFor="admin_name">Name</Label>
          <Input id="admin_name" value={form.name} onChange={(e) => onChange('name', e.target.value)} placeholder="Full name" />
        </div>
        <div className='space-y-2'>
          <Label htmlFor="admin_email">Email</Label>
          <Input id="admin_email" value={form.email} onChange={(e) => onChange('email', e.target.value)} placeholder="name@example.com" />
        </div>

        <div className='space-y-2'>
          <Label htmlFor="admin_nic">NIC</Label>
          <Input id="admin_nic" value={form.nic} onChange={(e) => onChange('nic', e.target.value)} placeholder="National ID" />
        </div>
        <div className='space-y-2'>
          <Label htmlFor="admin_phone">Phone</Label>
          <Input id="admin_phone" value={form.phone} onChange={(e) => onChange('phone', e.target.value)} placeholder="e.g. +947XXXXXXXX" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin_position">Position</Label>
          <Input id="admin_position" value={form.position} onChange={(e) => onChange('position', e.target.value)} placeholder="Role / title" />
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <Button type="submit" disabled={loading} className="ml-2">{loading ? 'Adding...' : 'Add admin'}</Button>
      </div>
    </form>
  );
}

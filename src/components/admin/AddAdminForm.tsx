"use client"

import React, { useState } from 'react';
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

export default function AddAdminForm() {
  const { toast } = useToast();
  const [form, setForm] = useState<AdminForm>({ name: '', email: '', nic: '', phone: '', position: '' });
  const [loading, setLoading] = useState(false);

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

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="admin_name">Name</Label>
          <Input id="admin_name" value={form.name} onChange={(e) => onChange('name', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="admin_email">Email</Label>
          <Input id="admin_email" value={form.email} onChange={(e) => onChange('email', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="admin_nic">NIC</Label>
          <Input id="admin_nic" value={form.nic} onChange={(e) => onChange('nic', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="admin_phone">Phone</Label>
          <Input id="admin_phone" value={form.phone} onChange={(e) => onChange('phone', e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="admin_position">Position</Label>
          <Input id="admin_position" value={form.position} onChange={(e) => onChange('position', e.target.value)} />
        </div>
      </div>

      <div className="pt-2">
        <Button type="submit" disabled={loading}>{loading ? 'Adding...' : 'Add admin'}</Button>
      </div>
    </form>
  );
}

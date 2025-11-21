"use client"

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

type StaffForm = {
  name: string;
  email: string;
  nic: string;
  phone: string;
  address: string;
  position: string;
};

export default function AddStaffForm() {
  const { toast } = useToast();
  const [form, setForm] = useState<StaffForm>({ name: '', email: '', nic: '', phone: '', address: '', position: '' });
  const [loading, setLoading] = useState(false);

  const onChange = (k: keyof StaffForm, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const validate = (f: StaffForm) => {
    if (!f.name.trim()) return 'Name is required';
    if (!f.email.trim()) return 'Email is required';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) return 'Enter a valid email';
    if (!f.nic.trim()) return 'NIC is required';
    if (!f.phone.trim()) return 'Phone is required';
    if (!f.address.trim()) return 'Address is required';
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
      const staffCol = collection(db, 'staff');
      await addDoc(staffCol, {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        nic: form.nic.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        position: form.position.trim(),
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Staff added', description: `${form.name} has been added to staff.` });
      setForm({ name: '', email: '', nic: '', phone: '', address: '', position: '' });
      // Create invite and send set-password email (best-effort)
      try {
        await fetch('/api/staff/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email.trim().toLowerCase(), name: form.name.trim() }),
        });
      } catch (err) {
        console.warn('Failed to create staff invite', err);
      }
    } catch (err) {
      console.error('Failed to add staff', err);
      toast({ title: 'Failed', description: 'Could not add staff — try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="staff_name">Name</Label>
          <Input id="staff_name" value={form.name} onChange={(e) => onChange('name', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="staff_email">Email</Label>
          <Input id="staff_email" value={form.email} onChange={(e) => onChange('email', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="staff_nic">NIC</Label>
          <Input id="staff_nic" value={form.nic} onChange={(e) => onChange('nic', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="staff_phone">Phone</Label>
          <Input id="staff_phone" value={form.phone} onChange={(e) => onChange('phone', e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="staff_address">Address</Label>
          <Input id="staff_address" value={form.address} onChange={(e) => onChange('address', e.target.value)} />
        </div>
        <div className="md:col-span-3">
          <Label htmlFor="staff_position">Position</Label>
          <Input id="staff_position" value={form.position} onChange={(e) => onChange('position', e.target.value)} />
        </div>
      </div>

      <div className="pt-2">
        <Button type="submit" disabled={loading}>{loading ? 'Adding...' : 'Add staff'}</Button>
      </div>
    </form>
  );
}

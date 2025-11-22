"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';

type Person = {
  id: string;
  name?: string;
  email?: string;
  nic?: string;
  phone?: string;
};

export default function DeleteUsers() {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<Person[]>([]);
  const [staff, setStaff] = useState<Person[]>([]);
  const [role, setRole] = useState<'admins' | 'staff'>('admins');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubAdmins = onSnapshot(collection(db, 'admins'), (snap) => {
      const docs: Person[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setAdmins(docs);
    }, (err) => {
      console.error('admins snapshot error', err);
    });

    const unsubStaff = onSnapshot(collection(db, 'staff'), (snap) => {
      const docs: Person[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setStaff(docs);
    }, (err) => {
      console.error('staff snapshot error', err);
    });

    return () => {
      try { unsubAdmins(); } catch {};
      try { unsubStaff(); } catch {};
    };
  }, []);

  const list = role === 'admins' ? admins : staff;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.nic || '').toLowerCase().includes(q)
    );
  }, [list, query]);

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Delete this record? This action cannot be undone.');
    if (!confirmed) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, role, id));
      toast({ title: 'Deleted', description: `${role === 'admins' ? 'Admin' : 'Staff'} record deleted.` });
    } catch (err) {
      console.error('Delete failed', err);
      toast({ title: 'Failed', description: 'Could not delete record.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delete Admin / Staff</CardTitle>
        <CardDescription>Search by name, email or NIC and delete selected record.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="flex items-center space-x-2">
            <label className="inline-flex items-center">
              <input type="radio" name="role" value="admins" checked={role === 'admins'} onChange={() => setRole('admins')} />
              <span className="ml-2">Admins</span>
            </label>
            <label className="inline-flex items-center ml-4">
              <input type="radio" name="role" value="staff" checked={role === 'staff'} onChange={() => setRole('staff')} />
              <span className="ml-2">Staff</span>
            </label>
          </div>

          <div className="flex-1">
            <Label htmlFor="search">Search</Label>
            <Input id="search" placeholder="Search by name, email or NIC" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground">No matching records.</div>
          ) : (
            filtered.map(p => (
              <div key={p.id} className="flex items-center justify-between border rounded p-2">
                <div>
                  <div className="font-medium">{p.name ?? p.email ?? p.id}</div>
                  <div className="text-sm text-muted-foreground">{p.email ?? ''} {p.nic ? `• ${p.nic}` : ''}</div>
                </div>
                <div>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(p.id)} disabled={loading}>{loading ? 'Deleting...' : 'Delete'}</Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

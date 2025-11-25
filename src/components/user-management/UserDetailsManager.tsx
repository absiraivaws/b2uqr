"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

export default function UserDetailsManager() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [userDoc, setUserDoc] = useState<null | { id: string; data: any }>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [checkedFields, setCheckedFields] = useState<Record<string, boolean>>({});
  const [searchBy, setSearchBy] = useState<'email' | 'phone' | 'nic'>('email');

  const requiredFields = ['displayName', 'email', 'phone', 'nic', 'merchantId', 'businessRegistrationNumber', 'merchantCity', 'bankCode', 'address'];

  useEffect(() => {
    // reset checkboxes whenever a new user is loaded or the searchBy changes
    if (!userDoc) {
      setCheckedFields({});
      return;
    }
    const initial: Record<string, boolean> = {};
    requiredFields.forEach(f => { initial[f] = f === searchBy });
    setCheckedFields(initial);
  }, [userDoc, searchBy]);

  const allChecked = requiredFields.every(f => Boolean(checkedFields[f]));

  const handleSearch = async () => {
    const q = email && email.trim();
    if (!q) {
      toast({ title: 'Enter email', description: 'Please enter an email to search.' });
      return;
    }
    setLoading(true);
    try {
      const usersCol = collection(db, 'users');
      const usersQuery = query(usersCol, where(searchBy, '==', q));
      const snap = await getDocs(usersQuery);
      if (snap.empty) {
        setUserDoc(null);
        toast({ title: 'Not found', description: `No user found with that ${searchBy}.` });
        return;
      }
      const docSnap = snap.docs[0];
      setUserDoc({ id: docSnap.id, data: docSnap.data() });
      setDialogOpen(true);
    } catch (e) {
      console.error('Search failed', e);
      toast({ title: 'Search failed', description: 'Could not search users — try again.' });
    } finally {
      setLoading(false);
    }
  };

  const toggleDetailsLocked = async () => {
    if (!userDoc) return;
    setLoading(true);
    try {
      const ref = doc(db, 'users', userDoc.id);
      const newVal = !Boolean(userDoc.data?.detailsLocked);
      await setDoc(ref, { detailsLocked: newVal }, { merge: true });
      setUserDoc({ id: userDoc.id, data: { ...userDoc.data, detailsLocked: newVal } });
      toast({ title: 'Updated', description: `User Details are ${newVal ? 'Locked' : 'Unlocked'}` });
    } catch (e) {
      console.error('Failed to update user', e);
      toast({ title: 'Update failed', description: 'Could not update user — try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="md:col-span-2 grid grid-cols-3 gap-2 items-end">
          <div className="col-span-1">
            <Label htmlFor="search_by">Search by</Label>
            <Select value={searchBy} onValueChange={(v) => setSearchBy(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Email" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="nic">NIC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label htmlFor="search_value">Search value</Label>
            <Input
              id="search_value"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={searchBy === 'email' ? 'user@example.com' : searchBy === 'phone' ? '+947XXXXXXXX' : 'NIC'}
            />
          </div>
        </div>
        <div className="">
          <Button onClick={handleSearch} disabled={loading}>Search</Button>
        </div>
      </div>

      {userDoc ? (
        <div className="space-y-4">

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="md:min-w-[60vw] md:min-h-[80vh] overflow-y-auto p-10">
              <DialogHeader>
                <DialogTitle>User details</DialogTitle>
                <DialogDescription>Full profile and merchant fields for this user.</DialogDescription>
              </DialogHeader>

              <div className="py-4 grid grid-cols-1 sm:grid-cols-2 gap-5 text-md">
                <div className="space-y-1 px-8 flex items-center">
                  <div className="mr-4 flex-none">
                    <Checkbox
                      checked={Boolean(checkedFields['displayName'])}
                      onCheckedChange={(c) => setCheckedFields(prev => ({ ...prev, displayName: Boolean(c) }))}
                    />
                  </div>
                  <div>
                    <div className="text-muted-foreground">Name</div>
                    <div className="font-medium">{userDoc.data?.displayName ?? '-'}</div>
                  </div>
                </div>
                <div className="space-y-1 px-8 flex items-center">
                  <div className="mr-4 flex-none">
                    <Checkbox
                      checked={Boolean(checkedFields['merchantId'])}
                      onCheckedChange={(c) => setCheckedFields(prev => ({ ...prev, merchantId: Boolean(c) }))}
                    />
                  </div>
                  <div>
                    <div className="text-muted-foreground">Merchant ID</div>
                    <div className="font-medium">{userDoc.data?.merchantId ?? '-'}</div>
                  </div>
                </div>
                <div className="space-y-1 px-8 flex items-center">
                  <div className="mr-4 flex-none">
                    <Checkbox
                      checked={Boolean(checkedFields['email'])}
                      onCheckedChange={(c) => setCheckedFields(prev => ({ ...prev, email: Boolean(c) }))}
                    />
                  </div>
                  <div>
                    <div className="text-muted-foreground">Email</div>
                    <div className="font-medium">{userDoc.data?.email ?? '-'}</div>
                  </div>
                </div>
                <div className="space-y-1 px-8 flex items-center">
                  <div className="mr-4 flex-none">
                    <Checkbox
                      checked={Boolean(checkedFields['businessRegistrationNumber'])}
                      onCheckedChange={(c) => setCheckedFields(prev => ({ ...prev, businessRegistrationNumber: Boolean(c) }))}
                    />
                  </div>
                  <div>
                    <div className="text-muted-foreground">Business Reg. No.</div>
                    <div className="font-medium">{userDoc.data?.businessRegistrationNumber ?? '-'}</div>
                  </div>
                </div>
                <div className="space-y-1 px-8 flex items-center">
                  <div className="mr-4 flex-none">
                    <Checkbox
                      checked={Boolean(checkedFields['phone'])}
                      onCheckedChange={(c) => setCheckedFields(prev => ({ ...prev, phone: Boolean(c) }))}
                    />
                  </div>
                  <div>
                    <div className="text-muted-foreground">Phone</div>
                    <div className="font-medium">{userDoc.data?.phone ?? '-'}</div>
                  </div>
                </div>
                <div className="space-y-1 px-8 flex items-center">
                  <div className="mr-4 flex-none">
                    <Checkbox
                      checked={Boolean(checkedFields['merchantCity'])}
                      onCheckedChange={(c) => setCheckedFields(prev => ({ ...prev, merchantCity: Boolean(c) }))}
                    />
                  </div>
                  <div>
                    <div className="text-muted-foreground">Merchant City</div>
                    <div className="font-medium">{userDoc.data?.merchantCity ?? '-'}</div>
                  </div>
                </div>
                <div className="space-y-1 px-8 flex items-center">
                  <div className="mr-4 flex-none">
                    <Checkbox
                      checked={Boolean(checkedFields['nic'])}
                      onCheckedChange={(c) => setCheckedFields(prev => ({ ...prev, nic: Boolean(c) }))}
                    />
                  </div>
                  <div>
                    <div className="text-muted-foreground">NIC</div>
                    <div className="font-medium">{userDoc.data?.nic ?? '-'}</div>
                  </div>
                </div>
                <div className="space-y-1 px-8 flex items-center">
                  <div className="mr-4 flex-none">
                    <Checkbox
                      checked={Boolean(checkedFields['bankCode'])}
                      onCheckedChange={(c) => setCheckedFields(prev => ({ ...prev, bankCode: Boolean(c) }))}
                    />
                  </div>
                  <div>
                    <div className="text-muted-foreground">Bank Code</div>
                    <div className="font-medium">{userDoc.data?.bankCode ?? '-'}</div>
                  </div>
                </div>
                <div className="sm:col-span-2 space-y-1 px-8">
                  <div className="flex items-start">
                    <div className="mr-4 flex-none pt-1">
                      <Checkbox
                        checked={Boolean(checkedFields['address'])}
                        onCheckedChange={(c) => setCheckedFields(prev => ({ ...prev, address: Boolean(c) }))}
                      />
                    </div>
                    <div>
                      <div className="text-muted-foreground">Address</div>
                      <div className="font-medium">{userDoc.data?.address ?? '-'}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center my-2">
                <div className="text-lg">
                  {userDoc.data?.detailsLocked ? 'This user details are Locked' : 'This user details are Unlocked'}
                </div>
                {!allChecked && (
                  <div className="text-sm text-muted-foreground">
                    Please check all confirmation boxes for the fields shown before toggling.
                  </div>
                )}
              </div>

              <DialogFooter>
                <div className="flex items-center space-x-2 w-full sm:justify-end">
                  <Button variant="destructive" onClick={async () => {
                    await toggleDetailsLocked();
                  }} disabled={loading || !allChecked}>
                    {userDoc.data?.detailsLocked ? 'Unlock details' : 'Lock details'}
                  </Button>
                  <DialogClose asChild>
                    <Button variant="secondary">Close</Button>
                  </DialogClose>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : null}
    </div>
  );
}

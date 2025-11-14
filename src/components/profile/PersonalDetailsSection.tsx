"use client";

import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export type PersonalDetailsHandle = {
  save: () => Promise<void>;
};

const PersonalDetailsSection = forwardRef<PersonalDetailsHandle, {}>((_, ref) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [nic, setNic] = useState('');
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState('');
  const [address, setAddress] = useState('');

  // Load user profile (auth + Firestore) locally; manage internal state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const refDoc = doc(db, 'users', user.uid);
        const snap = await getDoc(refDoc);
        if (snap.exists()) {
          const data = snap.data() as any;
          if (data.displayName) setName(data.displayName);
          if (data.email) setEmail(data.email);
          if (data.phone) setContactNumber(data.phone);
          if (data.whatsappNumber) setWhatsappNumber(data.whatsappNumber);
          if (data.nic) setNic(data.nic);
          if (data.businessRegistrationNumber) setBusinessRegistrationNumber(data.businessRegistrationNumber);
          if (data.address) setAddress(data.address);
        } else {
          if (user.displayName) setName(user.displayName);
          if (user.email) setEmail(user.email);
          if (user.phoneNumber) setContactNumber(user.phoneNumber);
        }
      } catch (e) {
        console.error('Failed to load user profile', e);
      }
    });
    return () => unsubscribe();
  }, []);

  useImperativeHandle(ref, () => ({
    save: async () => {
      // Per requirements, do not persist WhatsApp number or address here.
      // Personal details are read-only (from auth/initial signup) and not saved from this section.
      return Promise.resolve();
    }
  }), []);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} readOnly className="bg-muted" aria-readonly />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" type="email" value={email} readOnly className="bg-muted" aria-readonly />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact_number">Contact Number</Label>
          <Input id="contact_number" type="tel" value={contactNumber} readOnly className="bg-muted" aria-readonly />
        </div>
        <div className="space-y-2">
          <Label htmlFor="whatsappNumber">Whatsapp Number</Label>
          <Input id="whatsappNumber" type="tel" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="Enter Whatsapp number" readOnly className="bg-muted" aria-readonly />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nic">NIC</Label>
          <Input id="nic" type="text" value={nic} readOnly className="bg-muted" aria-readonly />
        </div>
        <div className="space-y-2">
          <Label htmlFor="businessRegistrationNumber">Business Registration Number</Label>
          <Input id="businessRegistrationNumber" type="text" value={businessRegistrationNumber} readOnly className="bg-muted" aria-readonly />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter address" readOnly className="bg-muted" aria-readonly />
      </div>
    </>
  );
});

export default PersonalDetailsSection;

"use client";

import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import type { LankaQRData } from '@/lib/qr-parser';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { allApiFields } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { bankCodeItems } from '@/lib/bankCodes';

export type MerchantDetailsHandle = { 
  save: () => Promise<void>;
  populateFromQR: (qrData: LankaQRData) => void;
  isLocked: () => boolean;
};

type Props = {
  onLoaded?: (loaded: boolean) => void;
};

const MerchantDetailsSection = forwardRef<MerchantDetailsHandle, Props>(({ onLoaded }, ref) => {
  const { toast } = useToast();
  const [locked, setLocked] = useState(false);
  const [saving, setSaving] = useState(false);

  // Local state only; do not load from useSettingsStore
  const [merchantId, setMerchantId] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [terminalId, setTerminalId] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [merchantCity, setMerchantCity] = useState('');

  const getFieldDef = (id: string) => allApiFields.find(f => f.id === id);

  useEffect(() => {
    let unsub = () => {};

    const loadForUser = async (user: any) => {
      if (onLoaded) onLoaded(false);
      try {
        const refDoc = doc(db, 'users', user.uid);
        const snap = await getDoc(refDoc);
        if (snap.exists()) {
          const data: any = snap.data();
          if (data.detailsLocked) setLocked(true);
          if (data.merchantId) setMerchantId(data.merchantId);
          if (data.bankCode) setBankCode(data.bankCode);
          if (data.terminalId) setTerminalId(data.terminalId);
          if (data.merchantName) setMerchantName(data.merchantName);
          if (data.merchantCity) setMerchantCity(data.merchantCity);
        }
      } catch (e) {
        console.error('Failed to load merchant details', e);
      } finally {
        if (onLoaded) onLoaded(true);
      }
    };

    unsub = onAuthStateChanged(auth, (user) => {
      if (user) loadForUser(user);
      else if (onLoaded) onLoaded(true);
    });

    return () => {
      try { unsub(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    save: async () => {
      const user = auth.currentUser;
      if (!user) {
        toast({ title: 'Not signed in', description: 'Please sign in to save changes.' });
        return;
      }
      if (locked) {
        toast({ title: 'Merchant details locked', description: 'These details can only be edited once.' });
        return;
      }
      setSaving(true);
      try {
        const refDoc = doc(db, 'users', user.uid);
        const payload: any = {
          merchantId: merchantId || null,
          bankCode: bankCode || null,
          terminalId: terminalId || null,
          merchantName: merchantName || null,
          merchantCity: merchantCity || null,
          detailsLocked: true,
        };
        await setDoc(refDoc, payload, { merge: true });
        setLocked(true);
        toast({ title: 'Saved', description: 'Merchant details saved. They are now locked.' });
      } catch (e) {
        console.error('Failed to save merchant details', e);
        toast({ title: 'Save failed', description: 'Could not save — try again.' });
      } finally {
        setSaving(false);
      }
    },
    populateFromQR: (qrData) => {
      if (locked) {
        toast({ title: 'Details locked', description: 'Merchant details are locked and cannot be modified.' });
        return;
      }
      setMerchantId(qrData.merchant_id);
      setBankCode(qrData.bank_code);
      setTerminalId(qrData.terminal_id);
      setMerchantName(qrData.merchant_name);
      setMerchantCity(qrData.merchant_city);
      toast({ title: 'Fields populated', description: 'Merchant details filled from QR code.' });
    },
    isLocked: () => locked,
  }), [locked, merchantId, bankCode, terminalId, merchantName, merchantCity, toast]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Label htmlFor="merchant_id">Merchant ID</Label>
        <Input
          id="merchant_id"
          value={merchantId}
          onChange={(e) => !locked && setMerchantId(e.target.value)}
          placeholder={getFieldDef('merchant_id')?.placeholder}
          maxLength={getFieldDef('merchant_id')?.maxLength}
          readOnly={locked}
          className={locked ? 'bg-muted' : ''}
        />
        <p className="text-xs text-muted-foreground">Must be {getFieldDef('merchant_id')?.maxLength} digits.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="bank_code">Bank</Label>
        <Select
          value={bankCode || undefined}
          onValueChange={(value) => !locked && setBankCode(value)}
          disabled={locked}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Bank" />
          </SelectTrigger>
          <SelectContent>
            {bankCodeItems.map((item: { value: string; label: string }) => (
              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Select your bank from the dropdown menu.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="terminal_id">Terminal ID</Label>
        <Input
          id="terminal_id"
          value={terminalId}
          onChange={(e) => !locked && setTerminalId(e.target.value)}
          placeholder={getFieldDef('terminal_id')?.placeholder}
          maxLength={getFieldDef('terminal_id')?.maxLength}
          readOnly={locked}
          className={locked ? 'bg-muted' : ''}
        />
        <p className="text-xs text-muted-foreground">Enter the terminal ID provided by your bank.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="merchant_name">Merchant Name</Label>
        <Input
          id="merchant_name"
          value={merchantName}
          onChange={(e) => !locked && setMerchantName(e.target.value)}
          maxLength={getFieldDef('merchant_name')?.maxLength}
          readOnly={locked}
          className={locked ? 'bg-muted' : ''}
        />
        <p className="text-xs text-muted-foreground">Max {getFieldDef('merchant_name')?.maxLength} characters.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="merchant_city">Merchant City</Label>
        <Input
          id="merchant_city"
          value={merchantCity}
          onChange={(e) => !locked && setMerchantCity(e.target.value)}
          maxLength={getFieldDef('merchant_city')?.maxLength}
          readOnly={locked}
          className={locked ? 'bg-muted' : ''}
        />
        <p className="text-xs text-muted-foreground">Max {getFieldDef('merchant_city')?.maxLength} characters.</p>
      </div>
    </div>
  );
});

export default MerchantDetailsSection;

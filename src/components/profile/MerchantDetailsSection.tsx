"use client";

import React, { useEffect, useMemo, useState, forwardRef, useImperativeHandle } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { allApiFields } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { bankCodeItems } from '@/lib/bankCodes';

export type MerchantDetailsHandle = { save: () => Promise<void> };

const MerchantDetailsSection = forwardRef<MerchantDetailsHandle, {}>((_, ref) => {
  const { toast } = useToast();
  const [locked, setLocked] = useState(false);
  const [saving, setSaving] = useState(false);

  // Local state only; do not load from useSettingsStore
  const [merchantId, setMerchantId] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [terminalId, setTerminalId] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [merchantCity, setMerchantCity] = useState('');
  const [mcc, setMcc] = useState('');
  const [referenceType, setReferenceType] = useState<'serial' | 'invoice' | ''>('');
  const [manualInvoice, setManualInvoice] = useState('');
  const [isCustomerReferenceEnabled, setIsCustomerReferenceEnabled] = useState<boolean>(false);

  const getFieldDef = (id: string) => allApiFields.find(f => f.id === id);

  const terminalIdOptions = useMemo(() => Array.from({ length: 10 }, (_, i) => String(i + 1).padStart(4, '0')), []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    (async () => {
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
          if (data.merchantCategoryCode) setMcc(data.merchantCategoryCode);
          if (data.referenceNumberType) setReferenceType(data.referenceNumberType);
          if (data.manualInvoice) setManualInvoice(data.manualInvoice);
          if (typeof data.includeCustomerReferenceInQrCode === 'boolean') setIsCustomerReferenceEnabled(data.includeCustomerReferenceInQrCode);
        }
      } catch (e) {
        console.error('Failed to load merchant details', e);
      }
    })();
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
          merchantCategoryCode: mcc || null,
          referenceNumberType: referenceType || null,
          manualInvoice: manualInvoice || null,
          includeCustomerReferenceInQrCode: isCustomerReferenceEnabled,
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
    }
  }), [locked, merchantId, bankCode, terminalId, merchantName, merchantCity, mcc, referenceType, manualInvoice, isCustomerReferenceEnabled]);

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
        <Select
          value={terminalId || undefined}
          onValueChange={(value) => !locked && setTerminalId(value)}
          disabled={locked}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Terminal ID" />
          </SelectTrigger>
          <SelectContent>
            {terminalIdOptions.map(option => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
      <div className="space-y-2">
        <Label htmlFor="mcc">Merchant Category Code</Label>
        <Input id="mcc" value={mcc} readOnly className="bg-muted" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="reference_type">Reference Number Type</Label>
        <Select
          value={referenceType || undefined}
          onValueChange={(value: 'serial' | 'invoice') => !locked && setReferenceType(value)}
          disabled={locked}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select reference type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="serial">Auto-generate Serial Number</SelectItem>
            <SelectItem value="invoice">Manual Invoice Number</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Determines how reference numbers are generated on the QR page.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="merchant_reference_label">Manual Invoice Prefix/Placeholder</Label>
        <Input
          id="merchant_reference_label"
          value={manualInvoice}
          onChange={(e) => !locked && setManualInvoice(e.target.value)}
          placeholder={getFieldDef('merchant_reference_label')?.placeholder}
          readOnly={locked}
          className={locked ? 'bg-muted' : ''}
        />
        <p className="text-xs text-muted-foreground">Placeholder for manual invoice entry mode.</p>
      </div>
      <div className="flex items-center space-x-2 pt-6">
        <Checkbox
          id="customer_reference_enabled"
          checked={isCustomerReferenceEnabled}
          onCheckedChange={(checked) => !locked && setIsCustomerReferenceEnabled(Boolean(checked))}
          disabled={locked}
        />
        <Label htmlFor="customer_reference_enabled" className="font-normal">
          Include Customer Reference in QR Code
        </Label>
      </div>
    </div>
  );
});

export default MerchantDetailsSection;

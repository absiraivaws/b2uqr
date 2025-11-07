
"use client"

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSettingsStore, allApiFields } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';


export default function ProfilePage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [dob, setDob] = useState('');
    const [address, setAddress] = useState('');
    const [saving, setSaving] = useState(false);
    const { 
        supportedFields, 
        setFieldValue, 
        referenceType, 
        setReferenceType,
        isCustomerReferenceEnabled,
        setIsCustomerReferenceEnabled
    } = useSettingsStore();
    const { toast } = useToast();
    
    const getField = (id: string) => {
        return supportedFields.find(sf => sf.id === id);
    }
    
    const getFieldDef = (id: string) => {
        return allApiFields.find(f => f.id === id);
    }

    const terminalIdOptions = Array.from({ length: 10 }, (_, i) => String(i + 1).padStart(4, '0'));

    useEffect(() => {
        // Listen for auth state and load user document from `users` collection
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                // not signed in
                return;
            }
            try {
                const ref = doc(db, 'users', user.uid);
                const snap = await getDoc(ref);
                if (snap.exists()) {
                    const data = snap.data() as any;
                    // map expected fields from user doc
                    if (data.displayName) setName(data.displayName);
                    if (data.email) setEmail(data.email);
                    if (data.phone) setContactNumber(data.phone);
                    if (data.whatsapp_number) setWhatsappNumber(data.whatsapp_number);
                    if (data.dob) setDob(data.dob);
                    if (data.address) setAddress(data.address);
                } else {
                    // Fall back to auth profile if user doc missing
                    if (user.displayName) setName(user.displayName);
                    if (user.email) setEmail(user.email);
                }
            } catch (e) {
                console.error('Failed to load user profile', e);
            }
        });
        return () => unsubscribe();
    }, []);

    const handleSave = async () => {
        // Persist profile fields to users/{uid}
        const user = auth.currentUser;
        if (!user) {
            toast({ title: 'Not signed in', description: 'Please sign in to save your profile.' });
            return;
        }
        setSaving(true);
        const ref = doc(db, 'users', user.uid);
        // Only persist editable fields (whatsapp_number and address)
        const payload: any = {
            whatsapp_number: whatsappNumber || null,
            address: address || null,
        };
        try {
            await setDoc(ref, payload, { merge: true });
            // optimistic UI already updated via state; show success
            toast({ title: 'Profile Saved', description: 'Your profile has been updated.' });
        } catch (e) {
            console.error('Failed to save profile', e);
            toast({ title: 'Save failed', description: 'Could not save profile — try again.' });
        } finally {
            setSaving(false);
        }
    }


  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Manage your personal and merchant information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
                    <Label htmlFor="whatsapp_number">Whatsapp Number</Label>
                    <Input id="whatsapp_number" type="tel" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="Enter Whatsapp number" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input id="dob" type="date" value={dob} readOnly className="bg-muted" aria-readonly />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>

            <hr className="my-6" />

            <h3 className="text-lg font-medium">Merchant Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label htmlFor="merchant_id">Merchant ID</Label>
                     <Input
                        id="merchant_id"
                        value={getField('merchant_id')?.value ?? ''}
                        onChange={(e) => setFieldValue('merchant_id', e.target.value)}
                        placeholder={getFieldDef('merchant_id')?.placeholder}
                        maxLength={getFieldDef('merchant_id')?.maxLength}
                    />
                    <p className="text-xs text-muted-foreground">Must be {getFieldDef('merchant_id')?.maxLength} digits.</p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="bank_code">Bank Code</Label>
                     <Input
                        id="bank_code"
                        value={getField('bank_code')?.value ?? ''}
                        onChange={(e) => setFieldValue('bank_code', e.target.value)}
                        placeholder={getFieldDef('bank_code')?.placeholder}
                        maxLength={getFieldDef('bank_code')?.maxLength}
                    />
                    <p className="text-xs text-muted-foreground">Must be {getFieldDef('bank_code')?.maxLength} digits.</p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="terminal_id">Terminal ID</Label>
                    <Select
                        value={getField('terminal_id')?.value ?? ''}
                        onValueChange={(value) => setFieldValue('terminal_id', value)}
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
                        value={getField('merchant_name')?.value ?? ''}
                        onChange={(e) => setFieldValue('merchant_name', e.target.value)}
                        maxLength={getFieldDef('merchant_name')?.maxLength}
                    />
                     <p className="text-xs text-muted-foreground">Max {getFieldDef('merchant_name')?.maxLength} characters.</p>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="merchant_city">Merchant City</Label>
                    <Input
                        id="merchant_city"
                        value={getField('merchant_city')?.value ?? ''}
                        onChange={(e) => setFieldValue('merchant_city', e.target.value)}
                        maxLength={getFieldDef('merchant_city')?.maxLength}
                    />
                    <p className="text-xs text-muted-foreground">Max {getFieldDef('merchant_city')?.maxLength} characters.</p>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="mcc">Merchant Category Code</Label>
                    <Input
                        id="mcc"
                        value={getField('mcc')?.value ?? ''}
                        readOnly
                        className="bg-muted"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="reference_type">Reference Number Type</Label>
                    <Select
                        value={referenceType}
                        onValueChange={(value: 'serial' | 'invoice') => setReferenceType(value)}
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
                        value={getField('merchant_reference_label')?.value ?? ''}
                        onChange={(e) => setFieldValue('merchant_reference_label', e.target.value)}
                        placeholder={getFieldDef('merchant_reference_label')?.placeholder}
                    />
                    <p className="text-xs text-muted-foreground">Placeholder for manual invoice entry mode.</p>
                </div>
                <div className="flex items-center space-x-2 pt-6">
                    <Checkbox
                        id="customer_reference_enabled"
                        checked={isCustomerReferenceEnabled}
                        onCheckedChange={(checked) => setIsCustomerReferenceEnabled(Boolean(checked))}
                    />
                    <Label htmlFor="customer_reference_enabled" className="font-normal">
                        Include Customer Reference in QR Code
                    </Label>
                </div>
            </div>

            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
        </CardContent>
      </Card>
    </main>
  );
}

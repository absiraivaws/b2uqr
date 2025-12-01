"use client";
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export type KycValues = {
  displayName: string;
  nic: string;
  businessReg: string;
  address: string;
  lat: string;
  lng: string;
  companyName?: string;
};

interface SignupKycSectionProps {
  values: KycValues;
  onChange: (values: KycValues) => void;
  accountType: 'individual' | 'company';
}

export default function SignupKycSection({ values, onChange, accountType }: SignupKycSectionProps) {
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const isCompany = accountType === 'company';

  const update = (patch: Partial<KycValues>) => {
    onChange({ ...values, ...patch });
  };

  const handleUseMyLocation = () => {
    setLocError(null);
    if (!('geolocation' in navigator)) {
      setLocError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          update({
            lat: pos.coords.latitude.toFixed(6),
            lng: pos.coords.longitude.toFixed(6),
          });
        } catch (e) { /* ignore */ }
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocError(err?.message || 'Failed to get your location.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <>
      {isCompany && (
        <div>
          <label className="text-sm">Company legal name</label>
          <Input
            value={values.companyName || ''}
            onChange={e => update({ companyName: e.target.value })}
            placeholder="Acme Holdings"
            required
          />
        </div>
      )}
      <div>
        <label className="text-sm">{isCompany ? 'Owner full name' : 'Full name'}</label>
        <Input value={values.displayName} onChange={e => update({ displayName: e.target.value })} placeholder="Jane Doe" required />
      </div>
      <div>
        <label className="text-sm">{isCompany ? 'Owner NIC' : 'NIC Number'}</label>
        <Input value={values.nic} onChange={e => update({ nic: e.target.value.trim() })} placeholder="123456789V" required />
      </div>
      <div>
        <label className="text-sm">{isCompany ? 'Company registration number' : 'Business Registration Number'}</label>
        <Input value={values.businessReg} onChange={e => update({ businessReg: e.target.value.trim() })} placeholder="BRN-XXXXXXX" required />
      </div>
      <div>
        <label className="text-sm">{isCompany ? 'Registered address' : 'Address'}</label>
        <Textarea value={values.address} onChange={e => update({ address: e.target.value })} placeholder="Street, City, Province, Postal Code" required />
      </div>
      <div>
        <label className="text-sm">{isCompany ? 'Registered GPS location' : 'GPS Location'}</label>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              value={values.lat}
              onChange={e => update({ lat: e.target.value })}
              placeholder="Latitude"
              inputMode="decimal"
              required
            />
            <Input
              value={values.lng}
              onChange={e => update({ lng: e.target.value })}
              placeholder="Longitude"
              inputMode="decimal"
              required
            />
            <Button type="button" onClick={handleUseMyLocation} disabled={locating}>
              {locating ? <Loader2 className="animate-spin h-4 w-4" /> : 'Use my location'}
            </Button>
          </div>
          {locError && <div className="text-xs text-destructive">{locError}</div>}
          {(values.lat !== '' && values.lng !== '') && (
            <div className="text-xs text-muted-foreground">Selected: {values.lat}, {values.lng}</div>
          )}
        </div>
      </div>
    </>
  );
}

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

export type KycRequiredFlags = Partial<Record<'companyName' | 'displayName' | 'nic' | 'businessReg' | 'address' | 'lat' | 'lng', boolean>>;

interface SignupKycSectionProps {
  values: KycValues;
  onChange: (values: KycValues) => void;
  accountType: 'individual' | 'company';
  requiredFlags?: KycRequiredFlags;
}

export default function SignupKycSection({ values, onChange, accountType, requiredFlags = {} }: SignupKycSectionProps) {
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const isCompany = accountType === 'company';
  const REQUIRED_TEXT = 'This field is required.';

  const RequiredFlag = ({ show }: { show?: boolean }) => {
    if (!show) return null;
    return (
      <div className="pointer-events-none absolute -top-2 right-2 -translate-y-full">
        <div className="relative border border-destructive text-destructive text-xs px-2 py-1 rounded shadow-md">
          {REQUIRED_TEXT}
          <div className="absolute -bottom-1 right-4 w-2 h-2 bg-destructive rotate-45" />
        </div>
      </div>
    );
  };

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
          <div className="relative mt-1">
            <RequiredFlag show={requiredFlags?.companyName} />
            <Input
              value={values.companyName || ''}
              onChange={e => update({ companyName: e.target.value })}
              placeholder="Acme Holdings"
              required
            />
          </div>
        </div>
      )}
      <div>
        <label className="text-sm">{isCompany ? 'Owner full name' : 'Full name'}</label>
        <div className="relative mt-1">
          <RequiredFlag show={requiredFlags?.displayName} />
          <Input value={values.displayName} onChange={e => update({ displayName: e.target.value })} placeholder="Jane Doe" required />
        </div>
      </div>
      <div>
        <label className="text-sm">{isCompany ? 'Owner NIC' : 'NIC Number'}</label>
        <div className="relative mt-1">
          <RequiredFlag show={requiredFlags?.nic} />
          <Input value={values.nic} onChange={e => update({ nic: e.target.value.trim() })} placeholder="123456789V" required />
        </div>
      </div>
      <div>
        <label className="text-sm">{isCompany ? 'Company registration number' : 'Business Registration Number'}</label>
        <div className="relative mt-1">
          <RequiredFlag show={requiredFlags?.businessReg} />
          <Input value={values.businessReg} onChange={e => update({ businessReg: e.target.value.trim() })} placeholder="BRN-XXXXXXX" required />
        </div>
      </div>
      <div>
        <label className="text-sm">{isCompany ? 'Registered address' : 'Address'}</label>
        <div className="relative mt-1">
          <RequiredFlag show={requiredFlags?.address} />
          <Textarea value={values.address} onChange={e => update({ address: e.target.value })} placeholder="Street, City, Province, Postal Code" required />
        </div>
      </div>
      <div>
        <label className="text-sm">{isCompany ? 'Registered GPS location' : 'GPS Location'}</label>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <div className="relative">
                <RequiredFlag show={requiredFlags?.lat} />
                <Input
                  value={values.lat}
                  onChange={e => update({ lat: e.target.value })}
                  placeholder="Latitude"
                  inputMode="decimal"
                  required
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="relative">
                <RequiredFlag show={requiredFlags?.lng} />
                <Input
                  value={values.lng}
                  onChange={e => update({ lng: e.target.value })}
                  placeholder="Longitude"
                  inputMode="decimal"
                  required
                />
              </div>
            </div>
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

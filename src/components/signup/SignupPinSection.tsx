"use client";
import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus } from "lucide-react";

interface SignupPinSectionProps {
  pin: string;
  setPin: (v: string) => void;
  confirmPin: string;
  setConfirmPin: (v: string) => void;
  saving: boolean;
  onSave: () => void;
}

export default function SignupPinSection({ pin, setPin, confirmPin, setConfirmPin, saving, onSave }: SignupPinSectionProps) {
  return (
    <>
      <div>
        <label className="text-sm">Create 4-6 digit PIN</label>
        <div className="flex gap-2">
          <Input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="1234" maxLength={6} />
        </div>
      </div>
      <div>
        <label className="text-sm">Confirm PIN</label>
        <div className="flex gap-2">
          <Input value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))} placeholder="1234" maxLength={6} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" className="flex-1" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="animate-spin h-4 w-4" /> : <UserPlus className="h-4 w-4 mr-2" />}
          {saving ? 'Saving...' : 'Save PIN & Continue'}
        </Button>
      </div>
    </>
  );
}

"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BranchInfo } from './types';

type CashierForm = {
  displayName: string;
  pin: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: BranchInfo | null;
  form: CashierForm;
  setForm: React.Dispatch<React.SetStateAction<CashierForm>>;
  onSubmit: () => void;
};

export default function CashierDialog({ open, onOpenChange, branch, form, setForm, onSubmit }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => onOpenChange(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{branch ? `New cashier for ${branch.name}` : 'Add cashier'}</DialogTitle>
          <DialogDescription>Each cashier receives a derived username and PIN for sign-in.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Cashier name</Label>
            <Input value={form.displayName} onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>PIN (4-6 digits)</Label>
            <Input value={form.pin} onChange={(e) => setForm((p) => ({ ...p, pin: e.target.value.replace(/\D/g, '').slice(0, 6) }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit}>Create cashier</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BranchInfo } from './types';

type ManagerForm = {
  displayName: string;
  phone: string;
  email: string;
  pin: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: BranchInfo | null;
  form: ManagerForm;
  setForm: React.Dispatch<React.SetStateAction<ManagerForm>>;
  onSubmit: () => void;
};

export default function ManagerDialog({ open, onOpenChange, branch, form, setForm, onSubmit }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => onOpenChange(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{branch ? `Manager for ${branch.name}` : 'Assign manager'}</DialogTitle>
          <DialogDescription>Provide the manager details and a PIN to activate the account.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Manager name</Label>
            <Input value={form.displayName} onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Contact phone (optional)</Label>
            <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Contact email (optional)</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>PIN (4-6 digits)</Label>
            <Input value={form.pin} onChange={(e) => setForm((p) => ({ ...p, pin: e.target.value.replace(/\D/g, '').slice(0, 6) }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit}>Save manager</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

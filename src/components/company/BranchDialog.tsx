"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

type BranchForm = {
  name: string;
  address: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: BranchForm;
  setForm: React.Dispatch<React.SetStateAction<BranchForm>>;
  onSubmit: (e?: React.FormEvent) => void;
  loading?: boolean;
};

export default function BranchDialog({ open, onOpenChange, form, setForm, onSubmit, loading }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => onOpenChange(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a branch</DialogTitle>
          <DialogDescription>Provide the branch name and an optional address.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Branch name</Label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Colombo HQ" required />
          </div>
          <div className="space-y-2">
            <Label>Address (optional)</Label>
            <Textarea value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} placeholder="Street, City" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => { onOpenChange(false); setForm({ name: '', address: '' }); }}>Cancel</Button>
          <Button onClick={(e) => onSubmit(e)} disabled={!!loading}>{loading ? 'Adding...' : 'Add branch'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

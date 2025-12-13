"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import type { CashierInfo } from './types';

interface Props {
  branch: {
    id: string;
    name: string;
    username: string;
    email?: string;
    cashiers: CashierInfo[];
  };
}

export default function BranchManagerClient({ branch }: Props) {
  const [cashiers, setCashiers] = useState<CashierInfo[]>(branch.cashiers);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ displayName: '', email: '' });
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCreateCashier = async () => {
    if (!form.displayName.trim() || !form.email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      toast({ title: 'Invalid input', description: 'Provide a name and valid email to invite cashier.' });
      return;
    }
    try {
      const res = await fetch(`/api/company/branches/${branch.id}/cashiers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: form.displayName, email: form.email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.message || 'Failed to invite cashier');
      setCashiers((prev) => [{ id: data.cashierId, username: data.username || '—', email: data.email, displayName: form.displayName, status: 'pending' }, ...prev]);
      toast({ title: 'Cashier invited', description: `Invite sent to ${form.email}` });
      setDialogOpen(false);
      setForm({ displayName: '', email: '' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to invite cashier', variant: 'destructive' });
    }
  };

  const deleteCashier = async (cashierId: string) => {
    setDeleting(cashierId);
    try {
      const res = await fetch(`/api/company/branches/${branch.id}/cashiers/${cashierId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.message || 'Failed to delete cashier');
      setCashiers((prev) => prev.filter((c) => c.id !== cashierId));
      toast({ title: 'Cashier removed' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to delete cashier', variant: 'destructive' });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{branch.name} branch</h1>
        <p className="text-sm text-muted-foreground">Default username: <span className="font-mono">{branch.username}</span></p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cashiers</CardTitle>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add cashier
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashiers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No cashiers yet.</TableCell>
                </TableRow>
              ) : cashiers.map((cashier) => (
                <TableRow key={cashier.id}>
                  <TableCell className="font-mono text-sm">{cashier.username}</TableCell>
                  <TableCell className="font-mono text-sm">{cashier.email ?? '-'}</TableCell>
                  <TableCell>{cashier.displayName}</TableCell>
                  <TableCell>
                    <Badge variant={cashier.status === 'active' ? 'secondary' : 'outline'} className="capitalize">{cashier.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => deleteCashier(cashier.id)} disabled={deleting === cashier.id}>
                      {deleting === cashier.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => setDialogOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add cashier</DialogTitle>
            <DialogDescription>Provide a display name and PIN for the cashier account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input className='bg-gray-300/50 dark:bg-transparent' value={form.displayName} onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Contact email (invite will be sent)</Label>
              <Input className='bg-gray-300/50 dark:bg-transparent' type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="cashier@example.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateCashier}>Invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, UserCog, Users } from 'lucide-react';

export type CashierInfo = {
  id: string;
  username: string;
  displayName: string;
  status: string;
};

export type BranchInfo = {
  id: string;
  name: string;
  username: string;
  managerName: string | null;
  managerContact: { email?: string | null; phone?: string | null } | null;
  managerUid?: string | null;
  cashiers: CashierInfo[];
};

interface Props {
  companyName: string;
  initialBranches: BranchInfo[];
}

type ManagerDialogState = {
  open: boolean;
  branch: BranchInfo | null;
};

type CashierDialogState = {
  open: boolean;
  branch: BranchInfo | null;
};

export default function CompanyBranchesClient({ companyName, initialBranches }: Props) {
  const [branches, setBranches] = useState<BranchInfo[]>(initialBranches);
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [branchForm, setBranchForm] = useState({ name: '', address: '' });
  const [managerDialog, setManagerDialog] = useState<ManagerDialogState>({ open: false, branch: null });
  const [managerForm, setManagerForm] = useState({ displayName: '', phone: '', email: '', pin: '' });
  const [cashierDialog, setCashierDialog] = useState<CashierDialogState>({ open: false, branch: null });
  const [cashierForm, setCashierForm] = useState({ displayName: '', pin: '' });
  const [removingManager, setRemovingManager] = useState<string | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<string | null>(null);
  const [deletingCashier, setDeletingCashier] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchForm.name.trim()) return;
    setCreatingBranch(true);
    try {
      const res = await fetch('/api/company/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: branchForm.name, address: branchForm.address }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.message || 'Failed to create branch');
      const newBranch: BranchInfo = {
        id: data.branchId,
        name: branchForm.name,
        username: data.username,
        managerName: null,
        managerContact: null,
        managerUid: null,
        cashiers: [],
      };
      setBranches((prev) => [newBranch, ...prev]);
      setBranchForm({ name: '', address: '' });
      toast({ title: 'Branch created', description: `Default username: ${data.username}` });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to create branch', variant: 'destructive' });
    } finally {
      setCreatingBranch(false);
    }
  };

  const openManagerDialog = (branch: BranchInfo) => {
    setManagerForm({
      displayName: branch.managerName ?? '',
      phone: branch.managerContact?.phone ?? '',
      email: branch.managerContact?.email ?? '',
      pin: '',
    });
    setManagerDialog({ open: true, branch });
  };

  const handleAssignManager = async () => {
    if (!managerDialog.branch) return;
    if (!managerForm.displayName.trim() || !/^[0-9]{4,6}$/.test(managerForm.pin)) {
      toast({ title: 'Invalid input', description: 'Enter manager name and a 4-6 digit PIN.' });
      return;
    }
    try {
      const res = await fetch(`/api/company/branches/${managerDialog.branch.id}/manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: managerForm.displayName,
          pin: managerForm.pin,
          phone: managerForm.phone || undefined,
          email: managerForm.email || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.message || 'Failed to set manager');
      setBranches((prev) => prev.map((b) => b.id === managerDialog.branch!.id ? {
        ...b,
        managerName: managerForm.displayName,
        managerContact: { phone: managerForm.phone || null, email: managerForm.email || null },
        managerUid: data.managerUid,
      } : b));
      toast({ title: 'Manager updated', description: `${managerDialog.branch.name} now uses username ${managerDialog.branch.username}` });
      setManagerDialog({ open: false, branch: null });
      setManagerForm({ displayName: '', phone: '', email: '', pin: '' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to set manager', variant: 'destructive' });
    }
  };

  const removeManager = async (branch: BranchInfo) => {
    setRemovingManager(branch.id);
    try {
      const res = await fetch(`/api/company/branches/${branch.id}/manager`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.message || 'Failed to remove manager');
      setBranches((prev) => prev.map((b) => b.id === branch.id ? {
        ...b,
        managerName: null,
        managerContact: null,
        managerUid: null,
      } : b));
      toast({ title: 'Manager removed', description: `${branch.name} manager account disabled.` });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to remove manager', variant: 'destructive' });
    } finally {
      setRemovingManager(null);
    }
  };

  const openCashierDialog = (branch: BranchInfo) => {
    setCashierForm({ displayName: '', pin: '' });
    setCashierDialog({ open: true, branch });
  };

  const handleCreateCashier = async () => {
    if (!cashierDialog.branch) return;
    if (!cashierForm.displayName.trim() || !/^[0-9]{4,6}$/.test(cashierForm.pin)) {
      toast({ title: 'Invalid input', description: 'Enter cashier name and a 4-6 digit PIN.' });
      return;
    }
    try {
      const res = await fetch(`/api/company/branches/${cashierDialog.branch.id}/cashiers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: cashierForm.displayName, pin: cashierForm.pin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.message || 'Failed to create cashier');
      setBranches((prev) => prev.map((b) => b.id === cashierDialog.branch!.id ? {
        ...b,
        cashiers: [{ id: data.cashierId, username: data.username, displayName: cashierForm.displayName, status: 'active' }, ...b.cashiers],
      } : b));
      toast({ title: 'Cashier created', description: `Credentials username: ${data.username}` });
      setCashierDialog({ open: false, branch: null });
      setCashierForm({ displayName: '', pin: '' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to create cashier', variant: 'destructive' });
    }
  };

  const deleteCashier = async (branchId: string, cashierId: string) => {
    setDeletingCashier(cashierId);
    try {
      const res = await fetch(`/api/company/branches/${branchId}/cashiers/${cashierId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.message || 'Failed to delete cashier');
      setBranches((prev) => prev.map((b) => b.id === branchId ? {
        ...b,
        cashiers: b.cashiers.filter((c) => c.id !== cashierId),
      } : b));
      toast({ title: 'Cashier removed' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to delete cashier', variant: 'destructive' });
    } finally {
      setDeletingCashier(null);
    }
  };

  const confirmDeleteBranch = async (branch: BranchInfo) => {
    const ok = window.confirm(`Delete branch "${branch.name}"? This also removes all cashiers.`);
    if (!ok) return;
    setDeletingBranch(branch.id);
    try {
      const res = await fetch(`/api/company/branches/${branch.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.message || 'Failed to delete branch');
      setBranches((prev) => prev.filter((b) => b.id !== branch.id));
      toast({ title: 'Branch deleted', description: `${branch.name} removed.` });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to delete branch', variant: 'destructive' });
    } finally {
      setDeletingBranch(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{companyName} branches</h1>
        <p className="text-muted-foreground">Manage company branches, managers, and cashiers.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add a branch</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateBranch}>
            <div className="space-y-2">
              <Label>Branch name</Label>
              <Input value={branchForm.name} onChange={(e) => setBranchForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Colombo HQ" required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Address (optional)</Label>
              <Textarea value={branchForm.address} onChange={(e) => setBranchForm((prev) => ({ ...prev, address: e.target.value }))} placeholder="Street, City" rows={2} />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={creatingBranch}>
                {creatingBranch ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Add branch
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {branches.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">No branches yet.</CardContent>
          </Card>
        ) : branches.map((branch) => (
          <Card key={branch.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-3">
                  {branch.name}
                  <Badge variant="outline" className="capitalize">{branch.managerName ? 'Managed' : 'Unassigned'}</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">Username: <span className="font-mono">{branch.username}</span></p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => confirmDeleteBranch(branch)} disabled={deletingBranch === branch.id}>
                {deletingBranch === branch.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <section>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Branch manager</p>
                    {branch.managerName ? (
                      <p className="text-sm text-muted-foreground">
                        {branch.managerName}
                        {branch.managerContact?.phone ? ` • ${branch.managerContact.phone}` : ''}
                        {branch.managerContact?.email ? ` • ${branch.managerContact.email}` : ''}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">No manager assigned</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {branch.managerName && (
                      <Button variant="outline" size="sm" onClick={() => removeManager(branch)} disabled={removingManager === branch.id}>
                        {removingManager === branch.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Remove
                      </Button>
                    )}
                    <Button size="sm" onClick={() => openManagerDialog(branch)}>
                      <UserCog className="mr-2 h-4 w-4" />
                      {branch.managerName ? 'Update manager' : 'Assign manager'}
                    </Button>
                  </div>
                </div>
              </section>

              <Separator />

              <section>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4" /> Cashiers</p>
                    <p className="text-sm text-muted-foreground">{branch.cashiers.length} account(s)</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openCashierDialog(branch)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add cashier
                  </Button>
                </div>
                <Table className="mt-4">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branch.cashiers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">No cashiers yet.</TableCell>
                      </TableRow>
                    ) : branch.cashiers.map((cashier) => (
                      <TableRow key={cashier.id}>
                        <TableCell className="font-mono text-sm">{cashier.username}</TableCell>
                        <TableCell>{cashier.displayName}</TableCell>
                        <TableCell>
                          <Badge variant={cashier.status === 'active' ? 'secondary' : 'outline'} className="capitalize">{cashier.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => deleteCashier(branch.id, cashier.id)} disabled={deletingCashier === cashier.id}>
                            {deletingCashier === cashier.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </section>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={managerDialog.open} onOpenChange={(open) => setManagerDialog((prev) => ({ ...prev, open, branch: open ? prev.branch : null }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{managerDialog.branch ? `Manager for ${managerDialog.branch.name}` : 'Assign manager'}</DialogTitle>
            <DialogDescription>Provide the manager details and a PIN to activate the account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Manager name</Label>
              <Input value={managerForm.displayName} onChange={(e) => setManagerForm((prev) => ({ ...prev, displayName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Contact phone (optional)</Label>
              <Input value={managerForm.phone} onChange={(e) => setManagerForm((prev) => ({ ...prev, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Contact email (optional)</Label>
              <Input type="email" value={managerForm.email} onChange={(e) => setManagerForm((prev) => ({ ...prev, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>PIN (4-6 digits)</Label>
              <Input value={managerForm.pin} onChange={(e) => setManagerForm((prev) => ({ ...prev, pin: e.target.value.replace(/\D/g, '').slice(0,6) }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setManagerDialog({ open: false, branch: null })}>Cancel</Button>
            <Button onClick={handleAssignManager}>Save manager</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cashierDialog.open} onOpenChange={(open) => setCashierDialog((prev) => ({ ...prev, open, branch: open ? prev.branch : null }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{cashierDialog.branch ? `New cashier for ${cashierDialog.branch.name}` : 'Add cashier'}</DialogTitle>
            <DialogDescription>Each cashier receives a derived username and PIN for sign-in.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Cashier name</Label>
              <Input value={cashierForm.displayName} onChange={(e) => setCashierForm((prev) => ({ ...prev, displayName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>PIN (4-6 digits)</Label>
              <Input value={cashierForm.pin} onChange={(e) => setCashierForm((prev) => ({ ...prev, pin: e.target.value.replace(/\D/g, '').slice(0,6) }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCashierDialog({ open: false, branch: null })}>Cancel</Button>
            <Button onClick={handleCreateCashier}>Create cashier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ManagerDialog from '@/components/company/ManagerDialog';
import CashierDialog from '@/components/company/CashierDialog';
import BranchDialog from '@/components/company/BranchDialog';
import BranchCard from '@/components/company/BranchCard';
import DeleteConfirmDialogs from '@/components/company/DeleteConfirmDialogs';
import { BranchInfo, ManagerDialogState, CashierDialogState } from '@/components/company/types';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle } from 'lucide-react';

interface Props {
  companyName: string;
  initialBranches: BranchInfo[];
}

export default function CompanyBranchesClient({ companyName, initialBranches }: Props) {
  const [branches, setBranches] = useState<BranchInfo[]>(initialBranches);
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [branchForm, setBranchForm] = useState({ name: '', address: '' });
  const [addBranchDialog, setAddBranchDialog] = useState(false);
  const [managerDialog, setManagerDialog] = useState<ManagerDialogState>({ open: false, branch: null });
  const [managerForm, setManagerForm] = useState({ displayName: '', phone: '', email: '' });
  const [assigningManager, setAssigningManager] = useState(false);
  const [cashierDialog, setCashierDialog] = useState<CashierDialogState>({ open: false, branch: null });
  const [cashierForm, setCashierForm] = useState({ displayName: '', pin: '' });
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null);
  // measurement of branch content moved into each BranchCard
  const [removingManager, setRemovingManager] = useState<string | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<string | null>(null);
  const [deletingCashier, setDeletingCashier] = useState<string | null>(null);
  const [branchToDelete, setBranchToDelete] = useState<BranchInfo | null>(null);
  const [cashierToDelete, setCashierToDelete] = useState<{ branchId: string; cashierId: string } | null>(null);
  const [managerToRemove, setManagerToRemove] = useState<BranchInfo | null>(null);
  const { toast } = useToast();

  const handleCreateBranch = async (e?: React.FormEvent) => {
    if (e?.preventDefault) e.preventDefault();
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
        branchNumber: typeof data.branchNumber === 'number' ? data.branchNumber : null,
        managerName: null,
        managerContact: null,
        managerUid: null,
        cashiers: [],
      };
      setBranches((prev) => [newBranch, ...prev]);
      setBranchForm({ name: '', address: '' });
      setAddBranchDialog(false);
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
    });
    setManagerDialog({ open: true, branch });
  };

  const handleAssignManager = async () => {
    if (!managerDialog.branch) return;
    // Require a display name and email so we can send the set-password email
    if (!managerForm.displayName.trim() || !managerForm.email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(managerForm.email)) {
      toast({ title: 'Invalid input', description: 'Enter manager name and a valid email to send the setup link.' });
      return;
    }
    setAssigningManager(true);
    try {
      const res = await fetch(`/api/company/branches/${managerDialog.branch.id}/manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: managerForm.displayName,
          phone: managerForm.phone || undefined,
          email: managerForm.email,
          // NOTE: Do not send or create a PIN here. Server will send a set-password email.
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
      toast({ title: 'Manager updated', description: `An email was sent to ${managerForm.email} so they can set their password.` });
      setManagerDialog({ open: false, branch: null });
      setManagerForm({ displayName: '', phone: '', email: '' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to set manager', variant: 'destructive' });
    } finally {
      setAssigningManager(false);
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
      // BranchCard will re-measure itself on prop changes
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
      // BranchCard will re-measure itself on prop changes
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
      // BranchCard will re-measure itself on prop changes
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to delete cashier', variant: 'destructive' });
    } finally {
      setDeletingCashier(null);
    }
  };

  const confirmDeleteBranch = (branch: BranchInfo) => {
    setBranchToDelete(branch);
  };

  const performDeleteBranch = async () => {
    if (!branchToDelete) return;
    const branch = branchToDelete;
    setDeletingBranch(branch.id);
    try {
      const res = await fetch(`/api/company/branches/${branch.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.message || 'Failed to delete branch');
      setBranches((prev) => prev.filter((b) => b.id !== branch.id));
      toast({ title: 'Branch deleted', description: `${branch.name} removed.` });
      // BranchCards removed, remaining cards will remain consistent
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to delete branch', variant: 'destructive' });
    } finally {
      setDeletingBranch(null);
      setBranchToDelete(null);
    }
  };

  // content refs and heights are handled inside BranchCard

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{companyName} branches</h1>
        <p className="text-muted-foreground">Manage company branches, managers, and cashiers.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row justify-between mb-6">
          <div>
            <CardTitle>Branches</CardTitle>
            <p className="text-muted-foreground">Manage company branches, managers, and cashiers.</p>
          </div>
          <div>
            <Button onClick={() => setAddBranchDialog(true)}>
              <PlusCircle className=" h-4 w-4" /> Add Branch
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {branches.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">No branches yet.</div>
          ) : (
            <div className="space-y-4">
              {branches.map((branch) => {
                const expanded = expandedBranch === branch.id;
                return (
                  <BranchCard
                    key={branch.id}
                    branch={branch}
                    expanded={expanded}
                    onToggle={() => setExpandedBranch(expanded ? null : branch.id)}
                    onRequestDeleteBranch={(b) => setBranchToDelete(b)}
                    deletingBranchId={deletingBranch}
                    onRequestDeleteCashier={(branchId, cashierId) => setCashierToDelete({ branchId, cashierId })}
                    deletingCashierId={deletingCashier}
                    onOpenManagerDialog={openManagerDialog}
                    onOpenCashierDialog={openCashierDialog}
                    onRequestRemoveManager={(b) => setManagerToRemove(b)}
                    removingManagerId={removingManager}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ManagerDialog
        open={managerDialog.open}
        onOpenChange={(open) => setManagerDialog((prev) => ({ ...prev, open, branch: open ? prev.branch : null }))}
        branch={managerDialog.branch}
        form={managerForm}
        setForm={setManagerForm}
        onSubmit={handleAssignManager}
        loading={assigningManager}
      />
      <CashierDialog
        open={cashierDialog.open}
        onOpenChange={(open) => setCashierDialog((prev) => ({ ...prev, open, branch: open ? prev.branch : null }))}
        branch={cashierDialog.branch}
        form={cashierForm}
        setForm={setCashierForm}
        onSubmit={handleCreateCashier}
      />
      <BranchDialog
        open={addBranchDialog}
        onOpenChange={(open) => setAddBranchDialog(open)}
        form={branchForm}
        setForm={setBranchForm}
        onSubmit={handleCreateBranch}
        loading={creatingBranch}
      />
      <DeleteConfirmDialogs
        branchToDelete={branchToDelete}
        setBranchToDelete={setBranchToDelete}
        performDeleteBranch={performDeleteBranch}
        deletingBranchId={deletingBranch}

        cashierToDelete={cashierToDelete}
        setCashierToDelete={setCashierToDelete}
        deleteCashier={deleteCashier}
        deletingCashierId={deletingCashier}

        managerToRemove={managerToRemove}
        setManagerToRemove={setManagerToRemove}
        removeManager={removeManager}
        removingManagerId={removingManager}
      />
    </div>
  );
}

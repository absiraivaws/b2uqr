"use client";

import React from 'react';
import { buttonVariants } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { BranchInfo } from './types';

type Props = {
  branchToDelete: BranchInfo | null;
  setBranchToDelete: (b: BranchInfo | null) => void;
  performDeleteBranch: () => void;
  deletingBranchId?: string | null;

  cashierToDelete: { branchId: string; cashierId: string } | null;
  setCashierToDelete: (c: { branchId: string; cashierId: string } | null) => void;
  deleteCashier: (branchId: string, cashierId: string) => void;
  deletingCashierId?: string | null;

  managerToRemove: BranchInfo | null;
  setManagerToRemove: (b: BranchInfo | null) => void;
  removeManager: (b: BranchInfo) => void;
  removingManagerId?: string | null;
};

export default function DeleteConfirmDialogs({ branchToDelete, setBranchToDelete, performDeleteBranch, deletingBranchId, cashierToDelete, setCashierToDelete, deleteCashier, deletingCashierId, managerToRemove, setManagerToRemove, removeManager, removingManagerId }: Props) {
  return (
    <>
      <AlertDialog open={!!branchToDelete} onOpenChange={(open) => { if (!open) setBranchToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete branch</AlertDialogTitle>
            <AlertDialogDescription>Delete branch "{branchToDelete?.name}" and all its cashiers. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className={buttonVariants({ variant: 'danger' })} onClick={performDeleteBranch}>
              {deletingBranchId ? 'Deleting...' : 'Delete branch'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!cashierToDelete} onOpenChange={(open) => { if (!open) setCashierToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete cashier</AlertDialogTitle>
            <AlertDialogDescription>Remove this cashier account. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className={buttonVariants({ variant: 'danger' })} onClick={() => {
              if (!cashierToDelete) return;
              deleteCashier(cashierToDelete.branchId, cashierToDelete.cashierId);
              setCashierToDelete(null);
            }}>
              {deletingCashierId ? 'Deleting...' : 'Delete cashier'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!managerToRemove} onOpenChange={(open) => { if (!open) setManagerToRemove(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove manager</AlertDialogTitle>
            <AlertDialogDescription>Remove manager account for "{managerToRemove?.name}". This will disable their access.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className={buttonVariants({ variant: 'danger' })} onClick={() => {
              if (!managerToRemove) return;
              removeManager(managerToRemove);
              setManagerToRemove(null);
            }}>
              {removingManagerId ? 'Removing...' : 'Remove manager'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

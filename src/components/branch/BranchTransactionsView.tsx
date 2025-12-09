"use client";

import useBranchTransactions from '@/hooks/use-branch-transactions';
import TransactionsTable from '@/components/transactions/TransactionsTable';
import { useEffect, useState } from 'react';

export default function BranchTransactionsView({ companyId, branchId, selectedBranchId, showBranchSelect = false, showCashierSelect = true }: { companyId: string; branchId: string; selectedBranchId?: string; showBranchSelect?: boolean; showCashierSelect?: boolean }) {
  const { transactions, loading, error } = useBranchTransactions(companyId, branchId);
  const [cashiers, setCashiers] = useState<{ id: string; username?: string; displayName?: string }[] | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!branchId) return;
    fetch(`/api/company/branches/${branchId}/cashiers`, { credentials: 'same-origin' })
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        if (data?.ok && Array.isArray(data.cashiers)) {
          setCashiers(data.cashiers.map((c: any) => ({ id: c.id, username: c.username, displayName: c.displayName })));
        } else {
          setCashiers([]);
        }
      })
      .catch(() => {
        if (mounted) setCashiers([]);
      });

    return () => { mounted = false; };
  }, [branchId]);

  return (
    <TransactionsTable
      transactions={transactions}
      loading={loading}
      error={error}
      title="Branch Transactions"
      description="View transactions for this branch."
      cashierOptions={cashiers ?? undefined}
      selectedBranchId={selectedBranchId}
      showBranchSelect={showBranchSelect}
      showCashierSelect={showCashierSelect}
    />
  );
}

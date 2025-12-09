'use client';

import useCompanyTransactions from '@/hooks/use-company-transactions';
import TransactionsTable from '@/components/transactions/TransactionsTable';
import { useEffect, useState } from 'react';

export default function CompanyTransactionsView({ companyId, showBranchSelect = true, showCashierSelect = true }: { companyId: string; showBranchSelect?: boolean; showCashierSelect?: boolean }) {
  const [branches, setBranches] = useState<{ id: string; slug?: string; name?: string }[] | null>(null);
  const [cashiers, setCashiers] = useState<{ id: string; username?: string; displayName?: string }[] | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | undefined>(undefined);
  const [selectedCashier, setSelectedCashier] = useState<string | undefined>(undefined);

  const { transactions, loading, error } = useCompanyTransactions(companyId, selectedBranch, selectedCashier);

  useEffect(() => {
    let mounted = true;
    if (!companyId) return;
    fetch(`/api/company/${companyId}/branches`, { credentials: 'same-origin' })
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        if (data?.ok && Array.isArray(data.branches)) {
          setBranches(data.branches.map((b: any) => ({ id: b.id, slug: b.slug, name: b.name })));
        } else {
          setBranches([]);
        }
      })
      .catch(() => { if (mounted) setBranches([]); });

    return () => { mounted = false; };
  }, [companyId]);

  useEffect(() => {
    let mounted = true;
    setCashiers(null);
    setSelectedCashier(undefined);
    if (!selectedBranch) {
      if (mounted) setCashiers(null);
      return;
    }
    fetch(`/api/company/branches/${selectedBranch}/cashiers`, { credentials: 'same-origin' })
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        if (data?.ok && Array.isArray(data.cashiers)) {
          setCashiers(data.cashiers.map((c: any) => ({ id: c.id, username: c.username, displayName: c.displayName })));
        } else {
          setCashiers([]);
        }
      })
      .catch(() => { if (mounted) setCashiers([]); });

    return () => { mounted = false; };
  }, [selectedBranch]);

  return (
    <TransactionsTable
      transactions={transactions}
      loading={loading}
      error={error}
      title="Company Transactions"
      description="View transactions from all branches and cashiers."
      branchOptions={branches ?? undefined}
      cashierOptions={cashiers ?? undefined}
      selectedBranchId={selectedBranch}
      onBranchChange={(b) => setSelectedBranch(typeof b === 'string' ? b : undefined)}
      selectedCashierId={selectedCashier}
      onCashierChange={(c) => setSelectedCashier(typeof c === 'string' ? c : undefined)}
      showBranchSelect={showBranchSelect}
      showCashierSelect={showCashierSelect}
    />
  );
}

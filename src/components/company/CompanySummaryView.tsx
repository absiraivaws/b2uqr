'use client';

import useCompanyTransactions from '@/hooks/use-company-transactions';
import SummaryDashboard from '@/components/summary/SummaryDashboard';
import { useEffect, useState } from 'react';

export default function CompanySummaryView({ companyId, showBranchSelect = true, showCashierSelect = true }: { companyId: string; showBranchSelect?: boolean; showCashierSelect?: boolean }) {
  const [branches, setBranches] = useState<{ id: string; slug?: string; name?: string }[] | null>(null);
  const [cashiers, setCashiers] = useState<{ id: string; username?: string; displayName?: string }[] | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | undefined>(undefined);
  const [selectedCashier, setSelectedCashier] = useState<string | undefined>(undefined);

  const { transactions } = useCompanyTransactions(companyId, selectedBranch, selectedCashier);

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
    <SummaryDashboard
      transactions={transactions}
      title="Company Summary"
      description="Overview of company performance across all branches."
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

"use client";

import useBranchTransactions from '@/hooks/use-branch-transactions';
import SummaryDashboard from '@/components/summary/SummaryDashboard';
import { useEffect, useState } from 'react';

export default function BranchSummaryView({ companyId, branchId }: { companyId: string; branchId: string }) {
  const { transactions } = useBranchTransactions(companyId, branchId);
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
    <SummaryDashboard
      transactions={transactions}
      title="Branch Summary"
      description="Overview of branch performance."
      cashierOptions={cashiers ?? undefined}
    />
  );
}

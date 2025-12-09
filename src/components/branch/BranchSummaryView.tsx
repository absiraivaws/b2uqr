"use client";

import useBranchTransactions from '@/hooks/use-branch-transactions';
import SummaryDashboard from '@/components/summary/SummaryDashboard';

export default function BranchSummaryView({ companyId, branchId }: { companyId: string; branchId: string }) {
  const { transactions } = useBranchTransactions(companyId, branchId);

  return (
    <SummaryDashboard
      transactions={transactions}
      title="Branch Summary"
      description="Overview of branch performance."
    />
  );
}

'use client';

import useCompanyTransactions from '@/hooks/use-company-transactions';
import SummaryDashboard from '@/components/summary/SummaryDashboard';

export default function CompanySummaryView({ companyId }: { companyId: string }) {
  const { transactions, loading } = useCompanyTransactions(companyId);

  return (
    <SummaryDashboard
      transactions={transactions}
      loading={loading}
      title="Company Summary"
      description="Overview of company performance across all branches."
    />
  );
}

"use client";
import useTransactions from '@/hooks/use-transactions';
import SummaryDashboard from '@/components/summary/SummaryDashboard';

export default function SummaryPage() {
  const { transactions, loading } = useTransactions();

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <SummaryDashboard transactions={transactions} showCashierSelect={false} showBranchSelect={false} />
    </main>
  );
}

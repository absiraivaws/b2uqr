"use client";

import useBranchTransactions from '@/hooks/use-branch-transactions';
import TransactionsTable from '@/components/transactions/TransactionsTable';

export default function BranchTransactionsView({ companyId, branchId }: { companyId: string; branchId: string }) {
  const { transactions, loading, error } = useBranchTransactions(companyId, branchId);

  return (
    <TransactionsTable
      transactions={transactions}
      loading={loading}
      error={error}
      title="Branch Transactions"
      description="View transactions for this branch."
    />
  );
}

'use client';

import useCompanyTransactions from '@/hooks/use-company-transactions';
import TransactionsTable from '@/components/transactions/TransactionsTable';

export default function CompanyTransactionsView({ companyId }: { companyId: string }) {
  const { transactions, loading, error } = useCompanyTransactions(companyId);

  return (
    <TransactionsTable
      transactions={transactions}
      loading={loading}
      error={error}
      title="Company Transactions"
      description="View transactions from all branches and cashiers."
    />
  );
}

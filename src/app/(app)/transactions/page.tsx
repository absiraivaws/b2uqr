'use client'

import useTransactions from '@/hooks/use-transactions';
import TransactionsTable from '@/components/transactions/TransactionsTable';

export default function TransactionsPage() {
	// Use hook to subscribe only to transactions belonging to the current user
	const { transactions, loading, error } = useTransactions();

	return (
		<main className="p-4 sm:p-6 lg:p-8">
			<TransactionsTable
				transactions={transactions}
				loading={loading}
				error={error}
				showCashierSelect={false}
				showBranchSelect={false}
			/>
		</main>
	);
}

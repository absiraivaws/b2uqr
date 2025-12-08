'use client'

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2 } from "lucide-react";
import useTransactions from '@/hooks/use-transactions';
import { format } from 'date-fns';


export default function TransactionsPage() {
	// Use hook to subscribe only to transactions belonging to the current user
	const { transactions, loading: isLoading, error } = useTransactions();

	const [searchTerm, setSearchTerm] = useState('');
	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');

	const clearFilters = () => {
		setSearchTerm('');
		setStartDate('');
		setEndDate('');
	};

	const filtersActive = searchTerm !== '' || startDate !== '' || endDate !== '';

	// subscriptions handled by `useTransactions`

	const filteredTransactions = useMemo(() => {
		return transactions.filter(tx => {
			const searchMatch = searchTerm === '' ||
				(typeof tx.amount === 'string' ? tx.amount : String(tx.amount)).includes(searchTerm) ||
				(tx.reference_number && tx.reference_number.includes(searchTerm)) ||
				(tx.transaction_id && tx.transaction_id.includes(searchTerm));

			// Defensive created_at parsing
			let createdAtDate: Date;
			try {
				if (typeof tx.created_at === 'string') {
					createdAtDate = new Date(tx.created_at);
				} else if (tx.created_at && typeof (tx.created_at as any).toDate === 'function') {
					createdAtDate = (tx.created_at as any).toDate();
				} else {
					createdAtDate = new Date(tx.created_at as any);
				}
			} catch (e) {
				createdAtDate = new Date();
			}

			// Date range filter
			if (startDate) {
				const s = new Date(startDate);
				if (createdAtDate < s) return false;
			}
			if (endDate) {
				const e = new Date(endDate);
				e.setDate(e.getDate() + 1); // include endDate day
				if (createdAtDate >= e) return false;
			}

			return searchMatch;
		});
	}, [transactions, searchTerm, startDate, endDate]);

	const getStatusVariant = (status: string) => {
		switch (status) {
			case 'SUCCESS': return 'default';
			case 'FAILED': return 'destructive';
			case 'PENDING': return 'secondary';
			default: return 'outline';
		}
	}


	return (
		<main className="p-4 sm:p-6 lg:p-8">
			<Card>
				<CardHeader>
					<CardTitle>Transactions History</CardTitle>
					<CardDescription>Search and view your past transactions.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-wrap items-center gap-4">
						<div className="relative flex-grow">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
							<Input
								placeholder="Search by amount, ref no..."
								className="pl-10"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
							/>
						</div>
						<Input
							type="date"
							className="w-full sm:w-[200px]"
							value={startDate}
							onChange={(e) => setStartDate(e.target.value)}
						/>
						<span className="hidden sm:inline">-</span>
						<Input
							type="date"
							className="w-full sm:w-[200px]"
							value={endDate}
							onChange={(e) => setEndDate(e.target.value)}
						/>
						<Button
							type="button"
							variant="outline"
							className="w-full sm:w-auto"
							onClick={clearFilters}
							disabled={!filtersActive}
						>
							Clear
						</Button>
					</div>
					<div className="border rounded-lg">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Date</TableHead>
									<TableHead>Terminal ID</TableHead>
									<TableHead>Amount</TableHead>
									<TableHead>Reference No</TableHead>
									<TableHead className="text-right">Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{isLoading ? (
									<TableRow>
										<TableCell colSpan={5} className="text-center">
											<div className="flex justify-center items-center p-8">
												<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
												<span className="ml-4">Loading transactions...</span>
											</div>
										</TableCell>
									</TableRow>
								) : error ? (
									<TableRow>
										<TableCell colSpan={5} className="text-center text-red-500 py-8">
											{typeof error === 'string' ? error : error?.message ?? 'Failed to fetch transactions.'}
										</TableCell>
									</TableRow>
								) : filteredTransactions.length > 0 ? (
									filteredTransactions.map((tx) => (
										<TableRow key={tx.transaction_uuid}>
											<TableCell>{
												// Defensive formatting for created_at
												((): string => {
													try {
														if (typeof tx.created_at === 'string') return format(new Date(tx.created_at), 'Pp');
														if (tx.created_at && typeof (tx.created_at as any).toDate === 'function') return format((tx.created_at as any).toDate(), 'Pp');
														return format(new Date(tx.created_at as any), 'Pp');
													} catch (e) {
														return '';
													}
												})()
											}</TableCell>
											<TableCell>{tx.bankResponse?.terminal_id ?? tx.terminal_id ?? 'N/A'}</TableCell>
											<TableCell>{parseFloat(tx.amount).toFixed(2)} {tx.currency}</TableCell>
											<TableCell>{tx.reference_number}</TableCell>
											<TableCell className="text-right">
												<Badge variant={getStatusVariant(tx.status)}>{tx.status}</Badge>
											</TableCell>
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell colSpan={5} className="text-center text-muted-foreground py-8">
											No transactions found.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</main>
	);
}

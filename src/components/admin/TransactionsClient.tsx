"use client"

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2 } from "lucide-react";
import useAllTransactions from '@/hooks/admin/use-all-transactions';
import useUsers from '@/hooks/admin/use-users';
import type { Transaction } from '@/lib/types';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export default function AdminTransactionsClient() {
	const { transactions, loading: isLoading, error } = useAllTransactions();

	const [searchTerm, setSearchTerm] = useState('');
	const [date, setDate] = useState<string>('');
	const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');

  const { users } = useUsers();

	const filteredTransactions = useMemo(() => {
		return transactions.filter(tx => {
			const searchMatch = searchTerm === '' ||
				(typeof tx.amount === 'string' ? tx.amount : String(tx.amount)).includes(searchTerm) ||
				(tx.reference_number && tx.reference_number.includes(searchTerm)) ||
				(tx.transaction_id && tx.transaction_id.includes(searchTerm)) ||
				(tx.bankResponse?.terminal_id && tx.bankResponse.terminal_id.includes(searchTerm));

			const createdAtDate = (typeof tx.created_at === 'string')
				? new Date(tx.created_at)
				: (tx.created_at && typeof (tx.created_at as any).toDate === 'function')
					? (tx.created_at as any).toDate()
					: new Date(tx.created_at as any);

			const dateMatch = date === '' || format(createdAtDate, 'yyyy-MM-dd') === date;
			const statusMatch = statusFilter === 'all' || (tx.status === statusFilter);
			const userMatch = selectedUser === 'all' || (tx.uid === selectedUser);

			return searchMatch && dateMatch && statusMatch && userMatch;
		});
	}, [transactions, searchTerm, date, statusFilter, selectedUser]);

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
					<CardTitle>All Transactions</CardTitle>
					<CardDescription>Search and view all users' past transactions.</CardDescription>
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
							className="w-full sm:w-auto"
							value={date}
							onChange={(e) => setDate(e.target.value)}
						/>
						<div className="w-full sm:w-auto">
							<Select value={statusFilter} onValueChange={setStatusFilter}>
								<SelectTrigger className="w-full sm:w-[180px]">
									<SelectValue placeholder="Select Status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Statuses</SelectItem>
									<SelectItem value="SUCCESS">SUCCESS</SelectItem>
									<SelectItem value="FAILED">FAILED</SelectItem>
									<SelectItem value="PENDING">PENDING</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Users dropdown */}
						<div className="w-full sm:w-auto">
							<Select value={selectedUser} onValueChange={setSelectedUser}>
								<SelectTrigger className="w-full sm:w-[220px]">
									<SelectValue placeholder="All Users" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Users</SelectItem>
									{users && users.map(u => (
										<SelectItem key={u.uid} value={u.uid}>{u.displayName ?? u.email ?? u.uid}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
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
									filteredTransactions.map((tx: Transaction) => (
										<TableRow key={tx.transaction_uuid}>
											<TableCell>{
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
											<TableCell>{isNaN(Number(tx.amount)) ? tx.amount : parseFloat(String(tx.amount)).toFixed(2)} {tx.currency}</TableCell>
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


'use client'

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2 } from "lucide-react";
import { getAllTransactions } from '@/lib/actions';
import type { Transaction } from '@/lib/types';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [date, setDate] = useState<string>('');
    const [terminalId, setTerminalId] = useState('all');

    useEffect(() => {
        async function fetchTransactions() {
            try {
                setIsLoading(true);
                const fetchedTransactions = await getAllTransactions();
                setTransactions(fetchedTransactions);
                setError(null);
            } catch (err) {
                setError('Failed to fetch transactions.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchTransactions();
    }, []);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const searchMatch = searchTerm === '' || 
                tx.amount.includes(searchTerm) || 
                tx.reference_number.includes(searchTerm) ||
                tx.transaction_id.includes(searchTerm) ||
                (tx.bankResponse?.terminal_id && tx.bankResponse.terminal_id.includes(searchTerm));

            const dateMatch = date === '' || format(new Date(tx.created_at), 'yyyy-MM-dd') === date;
            
            const terminalMatch = terminalId === 'all' || (tx.bankResponse?.terminal_id === terminalId);

            return searchMatch && dateMatch && terminalMatch;
        });
    }, [transactions, searchTerm, date, terminalId]);

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
                    className="w-full sm:w-auto"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                />
                 <div className="w-full sm:w-auto">
                    <Select value={terminalId} onValueChange={setTerminalId}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Select Terminal" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Terminals</SelectItem>
                            <SelectItem value="0001">0001</SelectItem>
                            <SelectItem value="0002">0002</SelectItem>
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
                                    {error}
                                </TableCell>
                            </TableRow>
                        ) : filteredTransactions.length > 0 ? (
                            filteredTransactions.map((tx) => (
                                <TableRow key={tx.transaction_uuid}>
                                    <TableCell>{format(new Date(tx.created_at), 'Pp')}</TableCell>
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

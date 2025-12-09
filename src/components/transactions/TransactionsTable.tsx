"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2 } from "lucide-react";
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Transaction } from '@/lib/types';
interface TransactionsTableProps {
  transactions: Transaction[];
  loading: boolean;
  error: Error | null;
  title?: string;
  description?: string;
  branchOptions?: { id: string; slug?: string; name?: string }[];
  cashierOptions?: { id: string; username?: string; displayName?: string }[];
  selectedBranchId?: string | undefined;
  onBranchChange?: (branchId: string | 'ALL' | undefined) => void;
  selectedCashierId?: string | undefined;
  onCashierChange?: (cashierId: string | 'ALL' | undefined) => void;
  showCashierSelect?: boolean;
  showBranchSelect?: boolean;
}

export default function TransactionsTable({
  transactions,
  loading,
  error,
  title = "Transactions History",
  description = "Search and view your past transactions.",
  branchOptions,
  cashierOptions,
  selectedBranchId,
  onBranchChange,
  selectedCashierId,
  onCashierChange,
  showCashierSelect = true,
  showBranchSelect = true,
}: TransactionsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cashierFilter, setCashierFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setStatusFilter('ALL');
    setCashierFilter('ALL');
    setBranchFilter('ALL');
    if (onBranchChange) onBranchChange(undefined);
    if (onCashierChange) onCashierChange(undefined);
  };

  const filtersActive = searchTerm !== '' || startDate !== '' || endDate !== '' || statusFilter !== 'ALL' || cashierFilter !== 'ALL' || branchFilter !== 'ALL';

  const effectiveBranch = selectedBranchId ?? branchFilter;
  const effectiveCashier = selectedCashierId ?? cashierFilter;

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

      // Status filter
      if (statusFilter !== 'ALL' && tx.status !== statusFilter) {
        return false;
      }

      // Cashier filter: only apply if effectiveCashier is set and tx has cashierId
      if (effectiveCashier !== 'ALL') {
        if (!tx.cashierId || tx.cashierId !== effectiveCashier) return false;
      }

      // Branch filter
      if (effectiveBranch !== 'ALL') {
        if (!tx.branchId || tx.branchId !== effectiveBranch) return false;
      }

      return searchMatch;
    });
  }, [transactions, searchTerm, startDate, endDate, statusFilter, cashierFilter, branchFilter]);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'SUCCESS': return 'default';
      case 'FAILED': return 'destructive';
      case 'PENDING': return 'secondary';
      default: return 'outline';
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
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
          {/* Branch select: optionally render and show loading item until branches load */}
          {showBranchSelect && (
          <Select
            value={selectedBranchId ?? branchFilter}
            onValueChange={(val) => {
              if (onBranchChange) onBranchChange(val === 'ALL' ? undefined : val);
              else setBranchFilter(val);
              // when branch changes, clear cashier selection
              if (!onCashierChange) setCashierFilter('ALL');
              if (onCashierChange) onCashierChange(undefined);
            }}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Branches</SelectItem>
              {branchOptions == null ? (
                <SelectItem value="LOADING" disabled>Loading branches...</SelectItem>
              ) : (
                branchOptions.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name || b.slug || b.id}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          )}

          {/* Cashier select is always shown; it's disabled until a branch is selected (cashierOptions provided) */}
          {showCashierSelect && (
          <Select
            value={selectedCashierId ?? cashierFilter}
            onValueChange={(val) => {
              if (onCashierChange) onCashierChange(val === 'ALL' ? undefined : val);
              else setCashierFilter(val);
            }}
          >
            {/* enable the select as soon as a branch is picked; options populate when cashierOptions arrives */}
            <SelectTrigger className="w-full sm:w-[200px]" disabled={!(effectiveBranch !== 'ALL')}>
              <SelectValue placeholder={effectiveBranch === 'ALL' ? 'Select branch first' : 'Cashier'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Cashiers</SelectItem>
              {/* show a loading item until cashierOptions is available */}
              {cashierOptions == null ? (
                <SelectItem value="LOADING" disabled>Loading cashiers...</SelectItem>
              ) : (
                cashierOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.displayName || c.username || c.id}</SelectItem>
                ))
              )}
            </SelectContent>
            </Select>
          )}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="SUCCESS">Success</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
            </SelectContent>
          </Select>
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
                <TableHead>Amount</TableHead>
                <TableHead>Reference No</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    <div className="flex justify-center items-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <span className="ml-4">Loading transactions...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-red-500 py-8">
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
                    <TableCell>{parseFloat(tx.amount).toFixed(2)} {tx.currency}</TableCell>
                    <TableCell>{tx.reference_number}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={getStatusVariant(tx.status)}>{tx.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No transactions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

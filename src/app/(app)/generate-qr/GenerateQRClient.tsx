"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useTransactionManager } from "@/hooks/use-transaction-manager";
import useTransactions from "@/hooks/use-transactions";
import type { Transaction } from "@/lib/types";
import { TransactionForm } from "@/components/generate-qr/TransactionForm";
import { TransactionStatus } from "@/components/generate-qr/TransactionStatus";
import { TransactionLoading, TransactionEmpty } from "@/components/generate-qr/TransactionStates";

const MAX_RECENT_TRANSACTIONS = 5;

const formatCreatedAt = (createdAt: Transaction["created_at"]) => {
  try {
    if (typeof createdAt === "string") {
      return format(new Date(createdAt), "Pp");
    }
    if (createdAt && typeof (createdAt as any).toDate === "function") {
      return format((createdAt as any).toDate(), "Pp");
    }
    return format(new Date(createdAt as any), "Pp");
  } catch {
    return "";
  }
};

const getStatusVariant = (status?: string) => {
  switch (status) {
    case "SUCCESS":
      return "default" as const;
    case "FAILED":
      return "destructive" as const;
    case "PENDING":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
};

const formatAmount = (amount: Transaction["amount"], currency?: string | null) => {
  const numericAmount = typeof amount === "number" ? amount : parseFloat(amount ?? "0");
  if (Number.isNaN(numericAmount)) {
    return [amount ?? "0.00", currency ?? ""].join(" ").trim();
  }
  return `${numericAmount.toFixed(2)} ${currency ?? ""}`.trim();
};

export default function GenerateQRClient() {
  const {
    currentTransaction,
    isSubmitting,
    isVerifying,
    isSharing,
    isDownloading,
    referenceNumber,
    setReferenceNumber,
    amount,
    setAmount,
    manualReferencePlaceholder,
    referenceType,
    cashierNumberDisplay,
    handleCreateTransaction,
    handleVerifyTransaction,
    handleShareQR,
    handleDownloadQR,
  } = useTransactionManager();
  const {
    transactions,
    loading: isTransactionsLoading,
    error: recentTransactionsError,
  } = useTransactions();

  const recentTransactions = useMemo(
    () => transactions.slice(0, MAX_RECENT_TRANSACTIONS),
    [transactions]
  );

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col items-start gap-8 lg:flex-row">
        <div className="w-full space-y-8 lg:w-1/2">
          <TransactionForm
            onSubmit={handleCreateTransaction}
            isSubmitting={isSubmitting}
            referenceNumber={referenceNumber}
            setReferenceNumber={setReferenceNumber}
            amount={amount}
            onAmountChange={setAmount}
            status={currentTransaction?.status}
            referenceType={referenceType}
            manualReferencePlaceholder={manualReferencePlaceholder}
            cashierNumber={cashierNumberDisplay}
          />
          <div>
            {isSubmitting && !currentTransaction ? (
              <TransactionLoading />
            ) : currentTransaction ? (
              <TransactionStatus
                transaction={currentTransaction}
                onVerify={handleVerifyTransaction}
                isVerifying={isVerifying}
                onShare={handleShareQR}
                isSharing={isSharing}
                onDownload={handleDownloadQR}
                isDownloading={isDownloading}
              />
            ) : (
              <TransactionEmpty />
            )}
          </div>
        </div>
        <div className="w-full lg:w-1/2 lg:sticky lg:top-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Latest {MAX_RECENT_TRANSACTIONS} transactions processed.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="border-t">
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
                    {isTransactionsLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8">
                          <div className="flex items-center justify-center gap-3 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Loading recent transactions...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : recentTransactionsError ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-destructive">
                          {recentTransactionsError.message ?? "Failed to fetch transactions."}
                        </TableCell>
                      </TableRow>
                    ) : recentTransactions.length > 0 ? (
                      recentTransactions.map((tx, index) => (
                        <TableRow key={tx.transaction_uuid ?? tx.reference_number ?? tx.transaction_id ?? index}>
                          <TableCell>{formatCreatedAt(tx.created_at)}</TableCell>
                          <TableCell>{formatAmount(tx.amount, tx.currency)}</TableCell>
                          <TableCell>{tx.reference_number ?? "-"}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={getStatusVariant(tx.status)}>{tx.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                          No transactions found yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

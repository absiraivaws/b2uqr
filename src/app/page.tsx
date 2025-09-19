"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  createTransaction,
  getTransactionStatus,
  simulateWebhook,
  runReconciliation,
} from "@/lib/actions";
import type { Transaction } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, QrCode, AlertTriangle, CheckCircle, Clock } from "lucide-react";

function Header() {
  return (
    <header className="bg-card border-b">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <QrCode className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold font-headline">QR Bridge</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">Docs</Button>
            <Button variant="ghost" size="sm">API Keys</Button>
          </div>
        </div>
      </div>
    </header>
  );
}

function TransactionForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (formData: FormData) => void;
  isSubmitting: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a New Transaction</CardTitle>
        <CardDescription>Enter payment details to generate a QR code.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(new FormData(e.currentTarget));
          }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" name="amount" defaultValue="150.50" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" name="currency" defaultValue="LKR" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reference_number">Reference Number</Label>
            <Input id="reference_number" name="reference_number" defaultValue={`INV-${new Date().getFullYear()}${Math.floor(Math.random() * 10000)}`} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer_email">Customer Email</Label>
            <Input id="customer_email" name="customer_email" type="email" defaultValue="customer@example.com" />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate QR Code"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function TransactionStatus({
  transaction,
  onSimulateWebhook,
  isSimulating,
}: {
  transaction: Transaction;
  onSimulateWebhook: (status: "SUCCESS" | "FAILED") => void;
  isSimulating: boolean;
}) {
  
  const getStatusVariant = (status: Transaction["status"]) => {
    switch (status) {
      case "SUCCESS":
        return "default";
      case "FAILED":
        return "destructive";
      case "PENDING":
      default:
        return "secondary";
    }
  };

  const StatusIcon = ({ status }: { status: Transaction["status"] }) => {
    switch (status) {
      case "SUCCESS": return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "FAILED": return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "PENDING":
      default: return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Transaction Active</CardTitle>
                <CardDescription className="mt-1">Scan the QR code to complete payment.</CardDescription>
            </div>
            <Badge variant={getStatusVariant(transaction.status)} className="capitalize flex items-center gap-2">
                <StatusIcon status={transaction.status} />
                {transaction.status}
            </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col items-center justify-center p-6 bg-muted/50 rounded-lg">
          {transaction.status === "PENDING" ? (
             <Image
                src="https://picsum.photos/seed/qr-bridge/300/300"
                alt="QR Code"
                width={250}
                height={250}
                className="rounded-lg shadow-md"
                data-ai-hint="qr code"
              />
          ) : (
            <div className="w-[250px] h-[250px] flex flex-col items-center justify-center text-center bg-background rounded-lg shadow-md">
                <StatusIcon status={transaction.status} />
                <p className="mt-4 font-medium text-lg">Payment {transaction.status}</p>
                <p className="text-muted-foreground text-sm mt-1">
                    {transaction.status === 'SUCCESS' ? 'Transaction completed successfully.' : 'Transaction has failed.'}
                </p>
            </div>
          )}
          <p className="font-code text-xs text-muted-foreground mt-4 break-all">
            {transaction.qr_payload}
          </p>
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Transaction UUID</h3>
            <p className="font-code text-base">{transaction.transaction_uuid}</p>
          </div>
          <Separator />
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Amount</h3>
            <p className="text-base font-semibold">{transaction.currency} {transaction.amount}</p>
          </div>
          <Separator />
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Reference</h3>
            <p className="text-base">{transaction.reference_number}</p>
          </div>
          <Separator />
          {transaction.status === 'PENDING' && (
            <div className="pt-4">
                <h3 className="text-sm font-semibold mb-2">Simulate Webhook</h3>
                <p className="text-xs text-muted-foreground mb-3">
                    In a real scenario, the bank sends a webhook. Here you can simulate that call.
                </p>
                <div className="flex space-x-2">
                <Button
                    onClick={() => onSimulateWebhook("SUCCESS")}
                    variant="outline"
                    size="sm"
                    disabled={isSimulating}
                >
                    Simulate SUCCESS
                </Button>
                <Button
                    onClick={() => onSimulateWebhook("FAILED")}
                    variant="destructive"
                    size="sm"
                    disabled={isSimulating}
                >
                    Simulate FAILED
                </Button>
                </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (currentTransaction && currentTransaction.status === "PENDING") {
      interval = setInterval(async () => {
        try {
          const updatedTx = await getTransactionStatus(currentTransaction.transaction_uuid);
          if (updatedTx) {
            setCurrentTransaction(updatedTx);
          }
        } catch (error) {
          console.error("Failed to fetch transaction status:", error);
        }
      }, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentTransaction]);


  const handleCreateTransaction = async (formData: FormData) => {
    setIsSubmitting(true);
    try {
      const newTransaction = await createTransaction(formData);
      setCurrentTransaction(newTransaction);
      toast({
        title: "Transaction Created",
        description: `QR Code generated for UUID: ${newTransaction.transaction_uuid}`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        variant: "destructive",
        title: "Error Creating Transaction",
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulateWebhook = async (status: "SUCCESS" | "FAILED") => {
    if (!currentTransaction) return;
    setIsSimulating(true);
    try {
      await simulateWebhook(currentTransaction.transaction_uuid, status);
      toast({
        title: `Webhook Simulated: ${status}`,
        description: `Transaction status should update shortly.`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        variant: "destructive",
        title: "Webhook Simulation Failed",
        description: errorMessage,
      });
    } finally {
        setIsSimulating(false);
    }
  };

  const handleReconciliation = async () => {
    setIsReconciling(true);
    try {
        const result = await runReconciliation();
        toast({
            title: "Reconciliation Finished",
            description: result.message,
        });
        if (result.alert?.alertSent) {
            toast({
                variant: 'destructive',
                title: "AI Alert Triggered!",
                description: result.alert.message,
            });
        }
        // If the current transaction was reconciled, update its state
        if (currentTransaction) {
            const updatedTx = await getTransactionStatus(currentTransaction.transaction_uuid);
            if (updatedTx) {
                setCurrentTransaction(updatedTx);
            }
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        toast({
            variant: "destructive",
            title: "Reconciliation Failed",
            description: errorMessage,
        });
    } finally {
        setIsReconciling(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-1 space-y-8">
            <TransactionForm onSubmit={handleCreateTransaction} isSubmitting={isSubmitting} />
            <Card>
                <CardHeader>
                    <CardTitle>Developer Tools</CardTitle>
                    <CardDescription>Actions for testing and operations.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button
                      onClick={() => setCurrentTransaction(null)}
                      variant="outline"
                      className="w-full"
                    >
                      Create New Transaction
                    </Button>
                    <Button
                      onClick={handleReconciliation}
                      variant="secondary"
                      className="w-full"
                      disabled={isReconciling}
                    >
                      {isReconciling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Run Reconciliation Job
                    </Button>
                </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2">
            {currentTransaction ? (
              <TransactionStatus transaction={currentTransaction} onSimulateWebhook={handleSimulateWebhook} isSimulating={isSimulating} />
            ) : (
                <Card className="flex flex-col items-center justify-center h-full min-h-[500px] border-dashed">
                    <CardContent className="text-center">
                        <QrCode className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-medium">Waiting for transaction</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                        Use the form to generate a new QR code payment.
                        </p>
                    </CardContent>
                </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}


"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  createTransaction,
  getTransactionStatus,
  simulateWebhook,
} from "@/lib/actions";
import type { Transaction } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useSettingsStore } from "@/hooks/use-settings";
import { debounce } from 'lodash';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, QrCode, AlertTriangle, CheckCircle, Clock } from "lucide-react";

function TransactionForm({
  onAmountChange,
  isSubmitting,
  referenceNumber,
}: {
  onAmountChange: (amount: string) => void;
  isSubmitting: boolean;
  referenceNumber: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a New Transaction</CardTitle>
        <CardDescription>Enter a payment amount to generate a QR code.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input 
                id="amount" 
                name="amount" 
                placeholder="Enter amount" 
                onChange={(e) => onAmountChange(e.target.value)}
                required 
                type="number"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
                <Label htmlFor="reference_number">Reference Number</Label>
                <Input 
                  id="reference_number" 
                  name="reference_number" 
                  value={referenceNumber}
                  readOnly
                  />
             </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function TransactionStatus({
  transaction,
  onVerifyTransaction,
  isVerifying,
}: {
  transaction: Transaction;
  onVerifyTransaction: () => void;
  isVerifying: boolean;
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
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center p-6 bg-muted/50 rounded-lg">
          {transaction.status === "PENDING" ? (
             <Image
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(transaction.qr_payload)}&logo=https://storage.googleapis.com/proudcity/mebanenc/uploads/2021/03/Peoples-Pay-Logo.png`}
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
          
          <Button onClick={onVerifyTransaction} className="mt-4" variant="default" disabled={isVerifying || transaction.status !== 'PENDING'}>
             {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
             Verify Transaction
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function GenerateQRPage() {
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [lastTxNumber, setLastTxNumber] = useState(0);

  const { toast } = useToast();
  const { supportedFields } = useSettingsStore();

  const generateReferenceNumber = useCallback(() => {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const nextTxNumber = lastTxNumber + 1;
    const randomPart = String(nextTxNumber).padStart(6, '0');
    setReferenceNumber(`${yyyy}${mm}${dd}${randomPart}`);
    setLastTxNumber(nextTxNumber);
  }, [lastTxNumber]);

  useEffect(() => {
    // Generate initial reference number on mount
    generateReferenceNumber();
  }, []); // Eslint-disable-line react-hooks/exhaustive-deps, this should only run once

  const handleVerifyTransaction = async () => {
      if (!currentTransaction) return;
      setIsVerifying(true);
      try {
          const updatedTx = await getTransactionStatus(currentTransaction.transaction_uuid);
          if (updatedTx) {
              setCurrentTransaction(updatedTx);
              toast({
                  title: "Transaction Status Updated",
                  description: `Status is now: ${updatedTx.status}`,
              });
          }
      } catch (error) {
          toast({ variant: "destructive", title: "Error", description: "Could not verify transaction status." });
      } finally {
          setIsVerifying(false);
      }
  };


  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (currentTransaction && currentTransaction.status === "PENDING") {
      interval = setInterval(async () => {
        try {
          const updatedTx = await getTransactionStatus(currentTransaction.transaction_uuid);
          if (updatedTx) {
            setCurrentTransaction(prevTx => {
              // If status changes, update and stop polling
              if (prevTx?.status !== updatedTx.status) {
                if (interval) clearInterval(interval);
                generateReferenceNumber(); // Generate new ref for next transaction
                return updatedTx;
              }
              return prevTx; // Keep the old state to avoid re-renders
            });
          }
        } catch (error) {
          console.error("Failed to fetch transaction status:", error);
        }
      }, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentTransaction, generateReferenceNumber]);


  const handleCreateTransaction = async (amount: string) => {
    if (!amount || parseFloat(amount) <= 0) {
      setCurrentTransaction(null);
      return;
    }
    
    setIsSubmitting(true);
    setCurrentTransaction(null);
    
    const formData = new FormData();
    formData.set('amount', amount);
    formData.set('reference_number', referenceNumber);

    // Add all supported fields from settings to the form data
    supportedFields.forEach(field => {
      if (field.enabled || field.readOnly) {
         formData.set(field.id, field.value);
      }
    });

    try {
      const newTransaction = await createTransaction(formData);
      setCurrentTransaction(newTransaction);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        variant: "destructive",
        title: "Error Creating Transaction",
        description: errorMessage,
      });
      // If creation fails, generate a new reference number for the next attempt
      generateReferenceNumber();
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const debouncedCreateTransaction = useRef(
    debounce(handleCreateTransaction, 500)
  ).current;

  useEffect(() => {
    return () => {
      debouncedCreateTransaction.cancel();
    };
  }, [debouncedCreateTransaction]);


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

  return (
    <main className="p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-1 space-y-8">
              <TransactionForm onAmountChange={debouncedCreateTransaction} isSubmitting={isSubmitting} referenceNumber={referenceNumber} />
            </div>
            <div className="lg:col-span-2">
            {isSubmitting ? (
                 <Card className="flex flex-col items-center justify-center h-full min-h-[500px] border-dashed">
                    <CardContent className="text-center">
                        <Loader2 className="mx-auto h-12 w-12 text-muted-foreground animate-spin" />
                        <h3 className="mt-4 text-lg font-medium">Generating Transaction...</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Please wait while we create the transaction and QR code.
                        </p>
                    </CardContent>
                </Card>
            ) : currentTransaction ? (
                <TransactionStatus 
                    transaction={currentTransaction} 
                    onVerifyTransaction={handleVerifyTransaction}
                    isVerifying={isVerifying}
                />
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
  );
}


"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  createTransaction,
  getTransactionStatus,
  verifyTransaction,
} from "@/lib/actions";
import type { Transaction } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useSettingsStore } from "@/hooks/use-settings";


import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, QrCode, AlertTriangle, CheckCircle, Clock, ShieldCheck, Send, Share2 } from "lucide-react";

function TransactionForm({
  onSubmit,
  isSubmitting,
  referenceNumber,
  setReferenceNumber,
  terminalId,
  amount,
  onAmountChange,
  referenceType,
  manualReferencePlaceholder
}: {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isSubmitting: boolean;
  referenceNumber: string;
  setReferenceNumber: (ref: string) => void;
  terminalId: string;
  amount: string;
  onAmountChange: (amount: string) => void;
  referenceType: 'serial' | 'invoice';
  manualReferencePlaceholder: string;
}) {

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a New Transaction</CardTitle>
        <CardDescription>Enter a payment amount to generate a QR code.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={onSubmit}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label htmlFor="reference_number">Reference Number</Label>
                <Input 
                  id="reference_number" 
                  name="reference_number" 
                  value={referenceNumber}
                  readOnly={referenceType === 'serial'}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className={`font-mono ${referenceType === 'serial' ? 'bg-muted' : ''}`}
                  placeholder={referenceType === 'invoice' ? manualReferencePlaceholder : ''}
                  />
             </div>
             <div className="space-y-2">
                <Label htmlFor="terminal_id">Terminal ID</Label>
                <Input 
                  id="terminal_id" 
                  name="terminal_id" 
                  value={terminalId}
                  readOnly
                  className="bg-muted font-bold text-primary"
                  />
             </div>
          </div>
          <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input 
                id="amount" 
                name="amount" 
                placeholder="Enter amount to generate QR" 
                required 
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => onAmountChange(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <Button type="submit" disabled={isSubmitting || !amount || !referenceNumber} className="w-full">
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Generate QR Code
            </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function TransactionStatus({
  transaction,
  onVerify,
  isVerifying,
  onShare,
  isSharing,
}: {
  transaction: Transaction;
  onVerify: () => void;
  isVerifying: boolean;
  onShare: () => void;
  isSharing: boolean;
}) {
  
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
                <p className={`mt-4 font-medium text-lg ${transaction.status === 'SUCCESS' ? 'text-green-600' : 'text-red-600'}`}>
                    Payment {transaction.status}
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                    {transaction.status === 'SUCCESS' ? 'Transaction completed successfully.' : 'Transaction has failed.'}
                </p>
            </div>
          )}
        </div>

        {transaction.status === "PENDING" && (
           <div className="mt-4 flex flex-col sm:flex-row gap-3 items-center justify-center">
              <Button onClick={onVerify} disabled={isVerifying}>
                {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Verify Transaction
              </Button>
              <Button onClick={onShare} disabled={isSharing} variant="outline">
                {isSharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
                Share via WhatsApp
              </Button>
              <p className="text-xs text-muted-foreground mt-2 sm:hidden">Click to manually check or share the transaction.</p>
           </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function GenerateQRPage() {
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [lastTxNumber, setLastTxNumber] = useState(0);
  const [amount, setAmount] = useState("");

  const { toast } = useToast();
  const { referenceType, supportedFields } = useSettingsStore();
  const terminalId = supportedFields.find(f => f.id === 'terminal_id')?.value ?? '0001';
  const manualReferencePlaceholder = supportedFields.find(f => f.id === 'merchant_reference_label')?.value ?? 'INV-';

  const generateReferenceNumber = useCallback(() => {
    if (referenceType !== 'serial') return;
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const nextTxNumber = lastTxNumber + 1;
    const randomPart = String(nextTxNumber).padStart(6, '0');
    setReferenceNumber(`${yyyy}${mm}${dd}${randomPart}`);
    setLastTxNumber(nextTxNumber);
  }, [lastTxNumber, referenceType]);

  useEffect(() => {
    if(referenceType === 'serial') {
        generateReferenceNumber();
    } else {
        setReferenceNumber('');
    }
  }, [referenceType]); // Eslint-disable-line react-hooks/exhaustive-deps, generate new ref when type changes


  const handleCreateTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0 || !referenceNumber) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please provide a valid amount and reference number.",
      });
      return;
    }
    
    setIsSubmitting(true);
    setCurrentTransaction(null);
    
    const transactionData = {
        amount,
        reference_number: referenceNumber
    };

    try {
      const newTransaction = await createTransaction(transactionData);
      setCurrentTransaction(newTransaction);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        variant: "destructive",
        title: "Error Creating Transaction",
        description: errorMessage,
      });
      if (referenceType === 'serial') {
        generateReferenceNumber();
      }
    } finally {
      setIsSubmitting(false);
    }
  };


  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (currentTransaction && currentTransaction.status === "PENDING" && !isVerifying) {
      interval = setInterval(async () => {
        try {
          const updatedTx = await getTransactionStatus(currentTransaction.transaction_uuid);
          if (updatedTx) {
            setCurrentTransaction(prevTx => {
              if (prevTx?.status !== updatedTx.status) {
                if (updatedTx.status === 'SUCCESS') {
                    // Temporarily removed sound while fixing source issue
                    // successSoundRef.current?.play();
                }
                if (interval) clearInterval(interval);
                if (referenceType === 'serial') {
                    generateReferenceNumber(); 
                } else {
                    setReferenceNumber('');
                }
                setAmount('');
                return updatedTx;
              }
              return prevTx; 
            });
          }
        } catch (error) {
          console.error("Failed to fetch transaction status:", error);
        }
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentTransaction, generateReferenceNumber, isVerifying, referenceType]);


  const handleVerifyTransaction = async () => {
    if (!currentTransaction) return;

    setIsVerifying(true);
    try {
        const updatedTx = await verifyTransaction(currentTransaction.transaction_uuid);
        if (updatedTx.status === 'SUCCESS') {
            toast({ title: "Verification Success", description: "The payment has been confirmed." });
            setAmount('');
        } else if (updatedTx.status === 'FAILED') {
            toast({ variant: "destructive", title: "Verification Failed", description: "The payment was not successful." });
        }
        setCurrentTransaction(updatedTx);
        if (updatedTx.status !== 'PENDING') {
            if (referenceType === 'serial') {
                generateReferenceNumber();
            } else {
                setReferenceNumber('');
            }
        }

    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
       toast({
        variant: "destructive",
        title: "Error Verifying Transaction",
        description: errorMessage,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleShareQR = async () => {
    if (!currentTransaction) return;

    setIsSharing(true);
    try {
      const merchantName = supportedFields.find(f => f.id === 'merchant_name')?.value || 'Merchant';
      const merchantCity = supportedFields.find(f => f.id === 'merchant_city')?.value || '';
      
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(currentTransaction.qr_payload)}&logo=https://storage.googleapis.com/proudcity/mebanenc/uploads/2021/03/Peoples-Pay-Logo.png`;
      
      // Fetch the QR code image
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      
      // Create canvas to combine QR code with caption
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');
      
      // Load QR image
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      const imgLoadPromise = new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      img.src = URL.createObjectURL(blob);
      await imgLoadPromise;
      
      // Set canvas dimensions (QR + caption area)
      const qrSize = 500;
      const padding = 30;
      const captionHeight = 280;
      canvas.width = qrSize + (padding * 2);
      canvas.height = qrSize + captionHeight + (padding * 2);
      
      // Fill background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw QR code
      ctx.drawImage(img, padding, padding, qrSize, qrSize);
      
      // Draw caption
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      const centerX = canvas.width / 2;
      let yPos = qrSize + padding + 40;
      
      // Title
      ctx.font = 'bold 24px Arial';
      ctx.fillText('Payment QR Code', centerX, yPos);
      yPos += 40;
      
      // Amount
      ctx.font = 'bold 28px Arial';
      ctx.fillStyle = '#16a34a';
      ctx.fillText(`LKR ${parseFloat(currentTransaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, centerX, yPos);
      yPos += 35;
      
      // Details
      ctx.font = '18px Arial';
      ctx.fillStyle = '#000000';
      ctx.fillText(`Reference: ${currentTransaction.reference_number}`, centerX, yPos);
      yPos += 30;
      ctx.fillText(`Merchant: ${merchantName}${merchantCity ? `, ${merchantCity}` : ''}`, centerX, yPos);
      yPos += 30;
      ctx.fillText(`Terminal: ${terminalId}`, centerX, yPos);
      yPos += 35;
      
      // Footer
      ctx.font = 'italic 16px Arial';
      ctx.fillStyle = '#666666';
      ctx.fillText('Scan this QR code to complete the payment', centerX, yPos);
      
      // Convert canvas to blob
      const compositeBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png', 1.0);
      });
      
      // Create file from composite image
      const file = new File([compositeBlob], `Payment-QR-${currentTransaction.reference_number}.png`, { type: 'image/png' });
      
      // Check if Web Share API is available and supports files
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Payment QR Code',
        });
        toast({ title: "Shared Successfully", description: "QR code shared successfully." });
      } else {
        // Fallback: Open WhatsApp Web with text and QR URL
        const whatsappMessage = `*Payment QR Code*\n\n` +
          `Amount: LKR ${parseFloat(currentTransaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
          `Reference: ${currentTransaction.reference_number}\n` +
          `Merchant: ${merchantName}${merchantCity ? `, ${merchantCity}` : ''}\n` +
          `Terminal: ${terminalId}\n\n` +
          `View QR: ${qrUrl}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;
        window.open(whatsappUrl, '_blank');
        toast({ title: "Opening WhatsApp", description: "Share the QR code in your chat." });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to share QR code";
      toast({
        variant: "destructive",
        title: "Error Sharing",
        description: errorMessage,
      });
    } finally {
      setIsSharing(false);
    }
  };
  

  return (
    <main className="p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-1 space-y-8">
              <TransactionForm 
                onSubmit={handleCreateTransaction}
                isSubmitting={isSubmitting} 
                referenceNumber={referenceNumber}
                setReferenceNumber={setReferenceNumber}
                terminalId={terminalId}
                amount={amount}
                onAmountChange={setAmount}
                referenceType={referenceType}
                manualReferencePlaceholder={manualReferencePlaceholder}
              />
            </div>
            <div className="lg:col-span-2">
            {isSubmitting && !currentTransaction ? ( // Show loader only during initial submission
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
                    onVerify={handleVerifyTransaction}
                    isVerifying={isVerifying}
                    onShare={handleShareQR}
                    isSharing={isSharing}
                />
            ) : (
                <Card className="flex flex-col items-center justify-center h-full min-h-[500px] border-dashed">
                    <CardContent className="text-center">
                        <QrCode className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-medium">Waiting for transaction</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                        Enter an amount and click "Generate QR Code" to start.
                        </p>
                    </CardContent>
                </Card>
            )}
            </div>
        </div>
    </main>
  );
}

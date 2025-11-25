"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSettingsStore } from "@/hooks/use-settings";
import {
  createTransaction,
  getTransactionStatus,
  verifyTransaction,
} from "@/lib/actions";
import type { Transaction } from "@/lib/types";
import { generateQRImage } from "@/lib/qr-image-generator";

export function useTransactionManager() {
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
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
    if (referenceType === 'serial') {
      generateReferenceNumber();
    } else {
      setReferenceNumber('');
    }
  }, [referenceType]); // eslint-disable-line react-hooks/exhaustive-deps

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

      const compositeBlob = await generateQRImage(
        currentTransaction.qr_payload,
        currentTransaction.amount,
        currentTransaction.reference_number,
        merchantName,
        merchantCity,
        terminalId
      );

      const file = new File([compositeBlob], `Payment-QR-${currentTransaction.reference_number}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Payment QR Code',
        });
        toast({ title: "Shared Successfully", description: "QR code shared successfully." });
      } else {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(currentTransaction.qr_payload)}&logo=https://storage.googleapis.com/proudcity/mebanenc/uploads/2021/03/Peoples-Pay-Logo.png`;
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

  const handleDownloadQR = async () => {
    if (!currentTransaction) return;

    setIsDownloading(true);
    try {
      const merchantName = supportedFields.find(f => f.id === 'merchant_name')?.value || 'Merchant';
      const merchantCity = supportedFields.find(f => f.id === 'merchant_city')?.value || '';

      const compositeBlob = await generateQRImage(
        currentTransaction.qr_payload,
        currentTransaction.amount,
        currentTransaction.reference_number,
        merchantName,
        merchantCity,
        terminalId
      );

      const url = URL.createObjectURL(compositeBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Payment-QR-${currentTransaction.reference_number}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ title: "Download Started", description: "QR code image has been downloaded." });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to download QR code";
      toast({
        variant: "destructive",
        title: "Error Downloading",
        description: errorMessage,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return {
    // State
    currentTransaction,
    isSubmitting,
    isVerifying,
    isSharing,
    isDownloading,
    referenceNumber,
    setReferenceNumber,
    amount,
    setAmount,
    terminalId,
    manualReferencePlaceholder,
    referenceType,
    // Actions
    handleCreateTransaction,
    handleVerifyTransaction,
    handleShareQR,
    handleDownloadQR,
  };
}

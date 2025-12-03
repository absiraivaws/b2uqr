"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSettingsStore } from "@/hooks/use-settings";
import {
  createTransaction,
  getTransactionStatus,
  verifyTransaction,
  getLastTransactionToday,
  getUserSettings,
} from "@/lib/actions";
import type { Transaction } from "@/lib/types";
import { generateQRImage } from "@/lib/qr-image-generator";
import { db } from "@/lib/firebase";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";

export function useTransactionManager() {
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [lastTxNumber, setLastTxNumber] = useState(0);
  const [amount, setAmount] = useState("");
  const [isLoadingCounter, setIsLoadingCounter] = useState(true);
  const processedSaleIdsRef = useRef<Set<string>>(new Set());
  const salesListenerInitializedRef = useRef(false);

  const { toast } = useToast();
  const { referenceType, supportedFields } = useSettingsStore();
  const fallbackTerminalId = supportedFields.find(f => f.id === 'terminal_id')?.value ?? '0001';
  const manualReferencePlaceholder = supportedFields.find(f => f.id === 'merchant_reference_label')?.value ?? 'INV-';

  // Terminal ID will be loaded from Firestore user doc when available.
  const [terminalId, setTerminalId] = useState<string>(fallbackTerminalId);
  const [userSettingsLoaded, setUserSettingsLoaded] = useState(false);

  // Load terminalId and other merchant settings from Firestore user document (server-side action)
  useEffect(() => {
    let mounted = true;
    async function loadUserSettings() {
      try {
        const userSettings = await getUserSettings();
        if (!mounted) return;
        if (userSettings) {
          // support both `terminalId` and `terminal_id` field names
          const tid = (userSettings.terminalId ?? userSettings.terminal_id ?? userSettings.terminal_id)?.toString();
          if (tid) setTerminalId(tid);
        }
      } catch (err) {
        console.error('Failed to load user settings:', err);
      } finally {
        if (mounted) setUserSettingsLoaded(true);
      }
    }

    loadUserSettings();
    return () => { mounted = false; };
  }, []);

  // Function to extract counter from reference number
  const extractCounterFromReference = useCallback((refNum: string): number => {
    // Reference format: <terminalId>YYYYMMDD<6-digit-counter>
    // Extract last 6 digits
    const last6 = refNum.slice(-6);
    return parseInt(last6, 10) || 0;
  }, []);

  // Load the last transaction counter for today
  useEffect(() => {
    async function loadTodayCounter() {
      if (referenceType !== 'serial') {
        setIsLoadingCounter(false);
        return;
      }
      // Wait until we've attempted to load user settings so terminalId is finalized
      if (!userSettingsLoaded) return;

      setIsLoadingCounter(true);
      try {
        const lastTx = await getLastTransactionToday(terminalId);
        if (lastTx && lastTx.reference_number) {
          const date = new Date();
          const yyyy = date.getFullYear();
          const mm = String(date.getMonth() + 1).padStart(2, '0');
          const dd = String(date.getDate()).padStart(2, '0');
          const todayPrefix = `${terminalId}${yyyy}${mm}${dd}`;
          
          // Check if the last transaction is from today
          if (lastTx.reference_number.startsWith(todayPrefix)) {
            const counter = extractCounterFromReference(lastTx.reference_number);
            setLastTxNumber(counter);
          } else {
            // Last transaction was from a previous day, reset to 0
            setLastTxNumber(0);
          }
        } else {
          // No transactions for today, start from 0
          setLastTxNumber(0);
        }
      } catch (error) {
        console.error('Error loading today counter:', error);
        setLastTxNumber(0);
      } finally {
        setIsLoadingCounter(false);
      }
    }
    
    loadTodayCounter();
  }, [terminalId, referenceType, extractCounterFromReference, userSettingsLoaded]);

  const generateReferenceNumber = useCallback(() => {
    if (referenceType !== 'serial') return;
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const nextTxNumber = lastTxNumber + 1;
    const randomPart = String(nextTxNumber).padStart(6, '0');
    setReferenceNumber(`${terminalId}${yyyy}${mm}${dd}${randomPart}`);
    setLastTxNumber(nextTxNumber);
  }, [lastTxNumber, referenceType, terminalId]);

  useEffect(() => {
    if (referenceType === 'serial' && !isLoadingCounter) {
      const date = new Date();
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const nextTxNumber = lastTxNumber + 1;
      const randomPart = String(nextTxNumber).padStart(6, '0');
      setReferenceNumber(`${terminalId}${yyyy}${mm}${dd}${randomPart}`);
    } else if (referenceType !== 'serial') {
      setReferenceNumber('');
    }
  }, [referenceType, isLoadingCounter, lastTxNumber, terminalId]);

  const performTransactionCreation = useCallback(
    async (amountValue: string, referenceValue: string, source: "manual" | "auto" = "manual") => {
      const parsedAmount = parseFloat(amountValue);
      if (!amountValue || Number.isNaN(parsedAmount) || parsedAmount <= 0 || !referenceValue) {
        toast({
          variant: "destructive",
          title: "Missing Information",
          description: "Please provide a valid amount and reference number.",
        });
        return null;
      }

      setIsSubmitting(true);
      setCurrentTransaction(null);

      const transactionData = {
        amount: parsedAmount.toFixed(2),
        reference_number: referenceValue,
      };

      try {
        const newTransaction = await createTransaction(transactionData);
        setCurrentTransaction(newTransaction);
        return newTransaction;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        const missingPrefix = 'Missing merchant configuration in Firestore user doc:';
        if (typeof errorMessage === 'string' && errorMessage.startsWith(missingPrefix)) {
          const missingList = errorMessage.slice(missingPrefix.length).trim();
          const missingFields = missingList ? missingList.split(',').map(s => s.trim()).filter(Boolean) : [];
          const fieldsStr = missingFields.length ? missingFields.join(', ') : 'required fields';

          toast({
            variant: "destructive",
            title: "Missing Merchant Configuration",
            description: `The following fields are missing in your Firestore user document: ${fieldsStr}.\nOpen Firebase Console → Firestore → collection 'users' → your user document and add these fields (examples: merchantId, bankCode, terminalId, merchantName, merchantCity, merchantCategoryCode, currencyCode, countryCode).`,
          });

          console.error('Missing merchant configuration. Example Firestore user doc fields to add:', {
            merchantId: 'xxxxxxxxxxxxxxxxxxx',
            bankCode: '16xxx',
            terminalId: 'xxxx',
            merchantName: 'Your Merchant Name',
            merchantCity: 'Your City',
            merchantCategoryCode: 'xxxx',
            currencyCode: '144',
            countryCode: 'LK',
          });
        } else {
          toast({
            variant: "destructive",
            title: "Error Creating Transaction",
            description: errorMessage,
          });
        }
        if (referenceType === 'serial') {
          generateReferenceNumber();
        }
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [toast, referenceType, generateReferenceNumber]
  );

  const handleCreateTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await performTransactionCreation(amount, referenceNumber, "manual");
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

  const handleIncomingSale = useCallback(
    async (saleData: Record<string, any>) => {
      if (isSubmitting) return;

      const rawTotal =
        saleData?.total ??
        saleData?.calculatedTotal ??
        null;
      const parsedTotal = typeof rawTotal === 'number' ? rawTotal : parseFloat(rawTotal ?? '0');
      if (!rawTotal || Number.isNaN(parsedTotal) || parsedTotal <= 0) {
        return;
      }

      const saleReference = saleData?.saleId ?? referenceNumber;

      let referenceToUse = referenceNumber;
      if (referenceType !== 'serial' && saleReference) {
        referenceToUse = String(saleReference);
        setReferenceNumber(referenceToUse);
      } else if (!referenceToUse && saleReference) {
        referenceToUse = String(saleReference);
        setReferenceNumber(referenceToUse);
      }

      if (!referenceToUse) {
        return;
      }

      const normalizedAmount = parsedTotal.toFixed(2);
      setAmount(normalizedAmount);
      await performTransactionCreation(normalizedAmount, referenceToUse, "auto");
    },
    [isSubmitting, performTransactionCreation, referenceNumber, referenceType]
  );

  useEffect(() => {
    const salesQuery = query(
      collection(db, "phppos_sales"),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(salesQuery, snapshot => {
      if (!salesListenerInitializedRef.current) {
        salesListenerInitializedRef.current = true;
        snapshot.docs.forEach(docSnap => {
          const existingId = docSnap.data()?.saleId ?? docSnap.id;
          if (existingId) {
            processedSaleIdsRef.current.add(String(existingId));
          }
        });
        return;
      }

      snapshot.docChanges().forEach(change => {
        if (change.type !== "added" && change.type !== "modified") return;
        const data = change.doc.data();
        const saleId = data?.saleId ?? change.doc.id;
        if (saleId && processedSaleIdsRef.current.has(String(saleId))) {
          if (change.type === "modified") {
            processedSaleIdsRef.current.delete(String(saleId));
          } else {
            return;
          }
        }
        if (saleId) {
          processedSaleIdsRef.current.add(String(saleId));
        }
        handleIncomingSale(data);
      });
    });

    return () => {
      unsubscribe();
    };
  }, [handleIncomingSale]);

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

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
  previewQR,
} from "@/lib/actions";
import type { Transaction } from "@/lib/types";
import { generateQRImage } from "@/lib/qr-image-generator";
import { auth, db } from "@/lib/firebase";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const SERIAL_COUNTER_DIGITS = 6;
const CASHIER_SERIAL_COUNTER_DIGITS = 4;
const COMPANY_SEGMENT_FALLBACK = 'MERCHANT';
const BRANCH_SEGMENT_FALLBACK = '000';
const CASHIER_SEGMENT_FALLBACK = '00';

const formatDateSegment = (date: Date) => {
  const yy = String(date.getFullYear() % 100).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
};

const normalizeCompanySegment = (input?: string | null) => {
  if (!input) return COMPANY_SEGMENT_FALLBACK;
  const cleaned = input.trim().replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return cleaned || COMPANY_SEGMENT_FALLBACK;
};

const formatNumericSegment = (
  value: number | string | null | undefined,
  length: number,
  fallback: string
) => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return String(value).padStart(length, '0');
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return String(parsed).padStart(length, '0');
    }
  }
  return fallback;
};

const parsePositiveInteger = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
};

const coalesceString = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length) {
        return trimmed;
      }
    }
  }
  return null;
};

export function useTransactionManager() {
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [includeReference, setIncludeReference] = useState<boolean>(true);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [lastTxNumber, setLastTxNumber] = useState(0);
  const [amount, setAmount] = useState("");
  const [isLoadingCounter, setIsLoadingCounter] = useState(true);
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);
  const processedSaleIdsRef = useRef<Set<string>>(new Set());
  const salesListenerInitializedRef = useRef(false);

  const { toast } = useToast();
  const { referenceType, supportedFields } = useSettingsStore();
  const fallbackTerminalId = supportedFields.find(f => f.id === 'terminal_id')?.value ?? '0001';
  const manualReferencePlaceholder = supportedFields.find(f => f.id === 'merchant_reference_label')?.value ?? 'INV-';

  // Terminal ID will be loaded from Firestore user doc when available.
  const [terminalId, setTerminalId] = useState<string>(fallbackTerminalId);
  const [userSettingsLoaded, setUserSettingsLoaded] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userCompanyName, setUserCompanyName] = useState<string | null>(null);
  const [userBranchNumber, setUserBranchNumber] = useState<number | null>(null);
  const [userCashierNumber, setUserCashierNumber] = useState<number | null>(null);

  const isCashierUser = userRole === 'cashier';
  const cashierNumberDisplay = isCashierUser
    ? formatNumericSegment(userCashierNumber, 2, CASHIER_SEGMENT_FALLBACK)
    : null;

  // Load terminalId and other merchant settings from Firestore user document (server-side action)
  useEffect(() => {
    let mounted = true;
    async function loadUserSettings() {
      try {
        const userSettings = await getUserSettings();
        if (!mounted) return;
        if (userSettings) {
          // support both `terminalId` and `terminal_id` field names
          const tid = (userSettings.terminalId ?? userSettings.terminal_id)?.toString();
          if (tid) setTerminalId(tid);

          const resolvedRole = typeof userSettings.role === 'string' ? userSettings.role : null;
          setUserRole(resolvedRole);

          const resolvedCompanyName = coalesceString(
            userSettings.companyName,
            userSettings.company_name,
            userSettings.companyMerchantSettings?.companyName,
            userSettings.companyMerchantSettings?.merchant_name
          );
          setUserCompanyName(resolvedCompanyName);

          const branchNumeric = parsePositiveInteger(
            userSettings.branchNumber ?? userSettings.branch_number
          );
          setUserBranchNumber(branchNumeric);

          const cashierNumeric = parsePositiveInteger(
            userSettings.cashierNumber ?? userSettings.cashier_number
          );
          setUserCashierNumber(cashierNumeric);
        } else {
          setUserRole(null);
          setUserCompanyName(null);
          setUserBranchNumber(null);
          setUserCashierNumber(null);
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

  // Function to dynamically get serial digit length (cashiers use shorter counters)
  const getSerialDigits = useCallback(() => (isCashierUser ? CASHIER_SERIAL_COUNTER_DIGITS : SERIAL_COUNTER_DIGITS), [isCashierUser]);

  // Function to extract counter from reference number
  const extractCounterFromReference = useCallback((refNum: string): number => {
    const digits = getSerialDigits();
    const lastDigits = refNum.slice(-digits);
    return parseInt(lastDigits, 10) || 0;
  }, [getSerialDigits]);

  const buildReferenceBase = useCallback(
    (date: Date = new Date()) => {
      const dateSegment = formatDateSegment(date);
      if (isCashierUser) {
        const branchSegment = formatNumericSegment(userBranchNumber, 3, BRANCH_SEGMENT_FALLBACK);
        const cashierSegment = formatNumericSegment(userCashierNumber, 2, CASHIER_SEGMENT_FALLBACK);
        return `${branchSegment}-${cashierSegment}-${dateSegment}`;
      }
      return dateSegment;
    },
    [isCashierUser, userBranchNumber, userCashierNumber]
  );

  const buildReferenceValue = useCallback(
    (counter: number, date: Date = new Date()) => {
      const digits = getSerialDigits();
      const counterPart = String(counter).padStart(digits, '0');
      return `${buildReferenceBase(date)}${counterPart}`;
    },
    [buildReferenceBase, getSerialDigits]
  );

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
        // Scope the lookup to the authenticated user so counters are per-user
        const lastTx = await getLastTransactionToday();
        if (lastTx && lastTx.reference_number) {
          const todayPrefix = buildReferenceBase(new Date());

          if (lastTx.reference_number.startsWith(todayPrefix)) {
            const counter = extractCounterFromReference(lastTx.reference_number);
            setLastTxNumber(counter);
          } else {
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
  }, [terminalId, referenceType, extractCounterFromReference, userSettingsLoaded, buildReferenceBase]);

  const generateReferenceNumber = useCallback(() => {
    if (referenceType !== 'serial') return;
    const nextTxNumber = lastTxNumber + 1;
    setReferenceNumber(buildReferenceValue(nextTxNumber));
    setLastTxNumber(nextTxNumber);
  }, [buildReferenceValue, lastTxNumber, referenceType]);

  useEffect(() => {
    if (referenceType === 'serial' && !isLoadingCounter) {
      const nextTxNumber = lastTxNumber + 1;
      setReferenceNumber(buildReferenceValue(nextTxNumber));
    } else if (referenceType !== 'serial') {
      setReferenceNumber('');
    }
  }, [referenceType, isLoadingCounter, lastTxNumber, buildReferenceValue]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUserUid(user?.uid ?? null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    processedSaleIdsRef.current.clear();
    salesListenerInitializedRef.current = false;
  }, [currentUserUid]);

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
        // Client-side timing and correlation id for diagnostics
        const requestId = (typeof window !== 'undefined' && window.crypto && (window.crypto as any).randomUUID)
          ? (window.crypto as any).randomUUID()
          : `req_${Date.now()}`;
        const clientStart = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

        const newTransaction = await createTransaction({ ...transactionData, _client_request_id: requestId });
        const fetchEnd = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        console.log(`${requestId} client createTransaction fetch RTT: ${fetchEnd - clientStart} ms`);

        setCurrentTransaction(newTransaction);

        try {
          const bc = new BroadcastChannel('lankaqr-overlay');
          bc.postMessage({ type: 'transaction', payload: newTransaction });
          bc.close();
        } catch (e) {
          // BroadcastChannel may be unavailable in some environments
        }

        // Also try posting to a local Electron overlay HTTP endpoint (dev helper)
        (async function tryPostLocal() {
          if (typeof window === 'undefined') return;
          const localUrls = [
            'http://127.0.0.1:3333/open',
            'http://localhost:3333/open',
            'http://127.0.0.1:4444/open',
            'http://localhost:4444/open'
          ];
          const payload = { transaction: newTransaction };
          for (const url of localUrls) {
            try {
              const controller = new AbortController();
              const id = setTimeout(() => controller.abort(), 1200);
              await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal,
              });
              clearTimeout(id);
              break; // stop after first success
            } catch (err) {
              // ignore and try next
            }
          }
        })();

        // Measure time to render (approx) — schedule a rAF so DOM updates can complete
        try {
          if (typeof window !== 'undefined' && window.requestAnimationFrame) {
            window.requestAnimationFrame(() => {
              const renderEnd = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
              console.log(`${requestId} client time to render (approx): ${renderEnd - clientStart} ms`);
            });
          }
        } catch (e) {
          // ignore
        }

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

  // Regenerate QR payload (preview) when the includeReference flag changes
  useEffect(() => {
    if (!currentTransaction) return;

    let cancelled = false;
    const tx = currentTransaction;
    async function regenPreview() {
      try {
        const preview = await previewQR({
          amount: tx!.amount,
          reference_number: includeReference ? tx!.reference_number : undefined,
        });
        if (cancelled) return;
        setCurrentTransaction(prev => (prev ? { ...prev, qr_payload: preview.qr_payload, expires_at: preview.expires_at } : prev));
      } catch (err) {
        console.error('Failed to regenerate preview QR:', err);
      }
    }

    regenPreview();
    return () => { cancelled = true; };
  }, [includeReference, currentTransaction?.transaction_uuid]);

  // Broadcast updated QR preview to overlay if present
  useEffect(() => {
    if (!currentTransaction) return;
    try {
      const bc = new BroadcastChannel('lankaqr-overlay');
      bc.postMessage({ type: 'transaction', payload: currentTransaction });
      bc.close();
    } catch (e) {
      // ignore
    }
  }, [currentTransaction?.qr_payload, currentTransaction?.status, currentTransaction?.amount]);

  // Also POST updates to local overlay endpoint (non-blocking)
  useEffect(() => {
    if (!currentTransaction) return;
    (async () => {
      if (typeof window === 'undefined') return;
      const localUrls = [
        'http://127.0.0.1:3333/open',
        'http://localhost:3333/open',
        'http://127.0.0.1:4444/open',
        'http://localhost:4444/open'
      ];
      const payload = { transaction: currentTransaction };
      for (const url of localUrls) {
        try {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), 1200);
          await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
          clearTimeout(id);
          break;
        } catch (err) {
          // try next
        }
      }
    })();
  }, [currentTransaction?.qr_payload, currentTransaction?.status, currentTransaction?.amount]);

  const handleIncomingSale = useCallback(
    async (saleData: Record<string, any>) => {
      if (isSubmitting) return;

      const rawTotal = saleData?.calculatedTotal ?? saleData?.total ?? null;
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

      // If this sale originated from PHPPOS (has a saleId) and we have a reference,
      // append the saleId to the reference for QR generation so the QR's caption
      // includes the PHPPOS sale identifier. Avoid double-appending if already present.
      const incomingSaleId = saleData?.saleId ?? null;
      if (incomingSaleId && referenceToUse) {
        const sid = String(incomingSaleId);
        if (!String(referenceToUse).endsWith(`-${sid}`)) {
          referenceToUse = `${referenceToUse}-${sid}`;
          setReferenceNumber(referenceToUse);
        }
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
    if (!currentUserUid) {
      return () => {};
    }

    const salesQuery = query(
      collection(db, "phppos_sales"),
      where("createdBy", "==", currentUserUid),
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
  }, [handleIncomingSale, currentUserUid]);

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

      const displayReference = (() => {
        const ref = currentTransaction.reference_number ?? '';
        const sid = currentTransaction.phppos_sale_id ?? null;
        if (sid && !ref.endsWith(`-${sid}`)) return `${ref}-${sid}`;
        return ref;
      })();

      const compositeBlob = await generateQRImage(
        currentTransaction.qr_payload,
        currentTransaction.amount,
        displayReference,
        merchantName,
        merchantCity,
        includeReference
      );

      const fileName = includeReference ? `Payment-QR-${displayReference}.png` : `Payment-QR.png`;
      const file = new File([compositeBlob], fileName, { type: 'image/png' });

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
          `${includeReference ? `Reference: ${displayReference}\n` : ''}` +
          `Merchant: ${merchantName}${merchantCity ? `, ${merchantCity}` : ''}\n\n` +
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

      const displayReference = (() => {
        const ref = currentTransaction.reference_number ?? '';
        const sid = currentTransaction.phppos_sale_id ?? null;
        if (sid && !ref.endsWith(`-${sid}`)) return `${ref}-${sid}`;
        return ref;
      })();

      const compositeBlob = await generateQRImage(
        currentTransaction.qr_payload,
        currentTransaction.amount,
        displayReference,
        merchantName,
        merchantCity,
        includeReference
      );

      const url = URL.createObjectURL(compositeBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = includeReference ? `Payment-QR-${displayReference}.png` : `Payment-QR.png`;
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
    cashierNumberDisplay,
    isCashierUser,
    includeReference,
    setIncludeReference,
    // Actions
    handleCreateTransaction,
    handleVerifyTransaction,
    handleShareQR,
    handleDownloadQR,
  };
}

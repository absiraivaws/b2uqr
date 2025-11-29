
'use server';

import { z } from "zod";
import type { Transaction, BankWebhookPayload } from "./types";
import {
  createDbTransaction,
  getDbTransaction,
  updateDbTransactionStatus,
  findPendingTransactions,
  getLastDbTransaction,
  getAllDbTransactions,
  getLastTransactionForToday,
} from "./db";
import { cookies } from 'next/headers';
import admin, { adminAuth, adminDb } from './firebaseAdmin';
import { callBankCreateQR, callBankReconciliationAPI } from "./bank-api";
import { verifyWebhookSignature } from "./security";
import { alertFailures, type AlertFailuresOutput } from "@/ai/flows/alert-failures";
import crypto from "crypto";

const TransactionSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
  reference_number: z.string().min(1, "Reference number is required"),
});

export async function createTransaction(transactionData: {amount: string, reference_number: string}): Promise<Transaction> {
  const parsed = TransactionSchema.safeParse(transactionData);

  if (!parsed.success) {
    // Log the detailed error for debugging
    console.error("Zod validation failed:", parsed.error.flatten().fieldErrors);
    // Provide a more specific error message to the user
    const firstError = parsed.error.errors[0];
    const errorMessage = `${firstError.path.join('.')} - ${firstError.message}`;
    throw new Error(errorMessage || "Invalid transaction data.");
  }
  const data = parsed.data;

  // 1. Generate transaction_uuid
   const transaction_uuid = `uuid_${crypto.randomBytes(12).toString('hex')}`;

  // For security and correctness, merchant configuration is read from Firestore
  // users/{uid} document. We require the user to be signed in (session cookie).
  let uid: string | null = null;
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (sessionCookie) {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
      if (decoded && decoded.uid) {
        uid = decoded.uid;
      }
    }
  } catch (err) {
    console.warn('Could not verify session cookie when creating transaction:', err);
  }

  if (!uid) {
    throw new Error('User must be signed in to create a transaction.');
  }

  const userDoc = await adminDb.collection('users').doc(uid).get();
  if (!userDoc.exists) {
    throw new Error('User document not found. Merchant configuration must be set in Firestore.');
  }

  const userData = userDoc.data() || {};

  const serverSideSettings = {
    merchant_id: (userData.merchantId ?? userData.merchant_id) as string | undefined,
    bank_code: (userData.bankCode ?? userData.bank_code) as string | undefined,
    terminal_id: (userData.terminalId ?? userData.terminal_id) as string | undefined,
    merchant_name: (userData.merchantName ?? userData.merchant_name) as string | undefined,
    merchant_city: (userData.merchantCity ?? userData.merchant_city) as string | undefined,
    mcc: (userData.merchantCategoryCode ?? userData.merchantCategoryCode ?? userData.mcc) as string | undefined,
    currency_code: (userData.currencyCode ?? userData.currency_code) as string | undefined,
    country_code: (userData.countryCode ?? userData.country_code) as string | undefined,
  };

  // Validate required merchant fields are present
  const required = ['merchant_id','bank_code','terminal_id','merchant_name','merchant_city','mcc','currency_code','country_code'];
  const missing = required.filter(k => !serverSideSettings[k as keyof typeof serverSideSettings]);
  if (missing.length) {
    throw new Error(`Missing merchant configuration in Firestore user doc: ${missing.join(', ')}`);
  }

  // Create a typed sanitized settings object (we validated presence above)
  const sanitizedSettings = {
    merchant_id: serverSideSettings.merchant_id as string,
    bank_code: serverSideSettings.bank_code as string,
    terminal_id: serverSideSettings.terminal_id as string,
    merchant_name: serverSideSettings.merchant_name as string,
    merchant_city: serverSideSettings.merchant_city as string,
    mcc: serverSideSettings.mcc as string,
    currency_code: serverSideSettings.currency_code as string,
    country_code: serverSideSettings.country_code as string,
  };

  // 2. Pre-save transaction object
  let pendingTx: Omit<Transaction, 'created_at' | 'updated_at'> = {
    transaction_id: `tx_${crypto.randomBytes(8).toString('hex')}`,
    transaction_uuid,
    status: "PENDING",
    qr_payload: "", // Will be filled after bank call
    expires_at: "", // Will be filled after bank call
    amount: data.amount,
    reference_number: data.reference_number,
    merchant_id: sanitizedSettings.merchant_id,
    terminal_id: sanitizedSettings.terminal_id,
    currency: 'LKR',
    merchant_name: sanitizedSettings.merchant_name,
    merchant_city: sanitizedSettings.merchant_city
  };

  // 3. Call Bank API to create QR
  const bankResponse = await callBankCreateQR({
    amount: data.amount,
    reference_number: data.reference_number,
    merchant_id: sanitizedSettings.merchant_id,
    bank_code: sanitizedSettings.bank_code,
    terminal_id: sanitizedSettings.terminal_id,
    merchant_name: sanitizedSettings.merchant_name,
    merchant_city: sanitizedSettings.merchant_city,
    mcc: sanitizedSettings.mcc,
    currency_code: sanitizedSettings.currency_code,
    country_code: sanitizedSettings.country_code,
  });

  // 4. Update transaction with QR data from bank
  pendingTx.qr_payload = bankResponse.qr_payload;
  pendingTx.expires_at = bankResponse.expires_at;

  // attach uid to transaction so we can query transactions by user later
  (pendingTx as any).uid = uid;

  const finalTx = await createDbTransaction(pendingTx);

  console.log("Created transaction:", finalTx.transaction_uuid);
  return finalTx;
}

export async function getTransactionStatus(uuid: string): Promise<Transaction | null> {
    const tx = await getDbTransaction(uuid);
    return tx || null;
}

export async function getAllTransactions(): Promise<Transaction[]> {
    return await getAllDbTransactions();
}

export async function getLastTransaction(): Promise<Transaction | null> {
  const tx = await getLastDbTransaction();
  return tx || null;
}

export async function getLastTransactionToday(terminalId: string): Promise<Transaction | null> {
  const tx = await getLastTransactionForToday(terminalId);
  return tx || null;
}

// Return the Firestore user document for the currently authenticated user (server-side).
// This reads from `users/{uid}` and returns the document data or null.
export async function getUserSettings(): Promise<Record<string, any> | null> {
  // Convert Firestore values to plain serializable JS values
  function sanitize(value: any): any {
    if (value === null || value === undefined) return null;
    // Firestore Timestamp
    if (typeof value?.toDate === 'function') {
      try {
        return value.toDate().toISOString();
      } catch (e) {
        // fallthrough
      }
    }
    // admin.firestore.Timestamp check
    if (admin && admin.firestore && value instanceof admin.firestore.Timestamp) {
      return value.toDate().toISOString();
    }
    // GeoPoint
    if (admin && admin.firestore && value instanceof admin.firestore.GeoPoint) {
      return { latitude: value.latitude, longitude: value.longitude };
    }
    if (Array.isArray(value)) return value.map(sanitize);
    if (typeof value === 'object') {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(value)) {
        out[k] = sanitize(v);
      }
      return out;
    }
    return value;
  }

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (!sessionCookie) return null;
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    if (!decoded || !decoded.uid) return null;

    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists) return null;
    const raw = userDoc.data() as Record<string, any>;
    return sanitize(raw);
  } catch (err) {
    console.error('Error fetching user settings:', err);
    return null;
  }
}


export async function verifyTransaction(uuid: string): Promise<Transaction> {
    console.log(`Verifying transaction ${uuid}`);
    const bankStatus = await callBankReconciliationAPI(uuid);

    if (!bankStatus) {
        throw new Error("Could not verify transaction with the bank.");
    }
    
    // In a real scenario, you'd get more details from the bank.
    // Here we're just updating the status.
    const bankResponsePayload = {
      status: bankStatus.status,
      verified_at: new Date().toISOString()
    }
    
    const updatedTx = await updateDbTransactionStatus(uuid, bankStatus.status, bankResponsePayload);

    if (!updatedTx) {
      throw new Error("Transaction not found after verification.");
    }
    
    return updatedTx;
}


// This function simulates the bank calling our webhook.
export async function simulateWebhook(uuid: string, status: "SUCCESS" | "FAILED"): Promise<void> {
  const tx = await getDbTransaction(uuid);
  if (!tx) {
    throw new Error("Transaction not found for webhook simulation.");
  }
  
  const payload: BankWebhookPayload = {
    transaction_uuid: tx.transaction_uuid,
    reference_number: tx.reference_number,
    amount: tx.amount,
    currency: tx.currency,
    status: status,
    auth_code: status === 'SUCCESS' ? `auth_${crypto.randomBytes(4).toString('hex')}` : 'N/A',
    paid_at: new Date().toISOString(),
    terminal_id: tx.terminal_id, // Include terminal_id in webhook
  };

  const rawBody = JSON.stringify(payload);
  const secret = process.env.BANK_WEBHOOK_SECRET || 'fake-webhook-secret';
  const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  // Use a relative path for the fetch call inside a server component/action
  const webhookUrl = '/api/bank/webhook';
  // Prefer an explicit base URL for non-Vercel hosts (e.g., Cloud Run)
  const baseUrl =
    process.env.APP_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:${process.env.PORT || 9002}`);
  
  await fetch(new URL(webhookUrl, baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Bank-Signature': signature,
    },
    body: rawBody,
  });
}

export async function handleWebhook(request: Request) {
    const rawBody = await request.text();
    const signature = request.headers.get('X-Bank-Signature');

    if (!signature) {
        await alertFailures({
            failureType: "webhook failure",
            details: "Missing X-Bank-Signature header.",
        });
        return { status: 400, body: { error: 'Missing signature' } };
    }

    const isValid = await verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
        await alertFailures({
            failureType: "webhook failure",
            details: "Invalid signature on incoming webhook.",
        });
        return { status: 403, body: { error: 'Invalid signature' } };
    }

    const payload: BankWebhookPayload = JSON.parse(rawBody);

    const tx = await getDbTransaction(payload.transaction_uuid);

    if (!tx) {
        await alertFailures({
            failureType: "unmatched transaction",
            details: `Webhook received for unknown transaction UUID: ${payload.transaction_uuid}`,
        });
        return { status: 404, body: { error: 'Transaction not found' } };
    }
    
    if (parseFloat(tx.amount).toFixed(2) !== parseFloat(payload.amount).toFixed(2)) {
        await alertFailures({
            failureType: "unmatched transaction",
            details: `Amount mismatch for UUID ${payload.transaction_uuid}. Expected ${tx.amount}, got ${payload.amount}.`,
        });
        return { status: 400, body: { error: 'Amount mismatch' } };
    }

    if (tx.status !== 'PENDING') {
        console.log(`Webhook for already processed transaction ${tx.transaction_uuid}. Status: ${tx.status}. Ignoring.`);
        return { status: 200, body: { message: 'Already processed' } };
    }

    await updateDbTransactionStatus(payload.transaction_uuid, payload.status, payload);

    console.log(`Webhook processed successfully for ${payload.transaction_uuid}. New status: ${payload.status}`);
    return { status: 200, body: { message: 'Webhook received' } };
}

export async function runReconciliation(): Promise<{ message: string; alert?: AlertFailuresOutput }> {
    console.log("Running reconciliation job...");
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const pendingTxs = await findPendingTransactions(tenMinutesAgo);

    if (pendingTxs.length === 0) {
        console.log("No stale pending transactions found.");
        return { message: "No stale pending transactions found." };
    }

    console.log(`Found ${pendingTxs.length} stale transaction(s) to reconcile.`);

    for (const tx of pendingTxs) {
        console.log(`Failing stale transaction ${tx.transaction_uuid}`);
        await updateDbTransactionStatus(tx.transaction_uuid, 'FAILED', { reconciled_at: new Date().toISOString(), reason: 'Stale' });
    }
    
    const alert = await alertFailures({
        failureType: 'Reconciliation Complete',
        details: `Found and failed ${pendingTxs.length} stale transactions that were older than 10 minutes.`,
    });

    return { message: `Reconciliation complete. Failed ${pendingTxs.length} stale transactions.`, alert };
}

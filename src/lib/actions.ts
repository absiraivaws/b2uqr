
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
} from "./db";
import { callBankCreateQR, callBankReconciliationAPI } from "./bank-api";
import { verifyWebhookSignature } from "./security";
import { alertFailures, type AlertFailuresOutput } from "@/ai/flows/alert-failures";
import crypto from "crypto";

const TransactionSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
  reference_number: z.string(),
  // From settings
  merchant_id: z.string().min(1, "Merchant ID is required."),
  bank_code: z.string().min(1, "Bank Code is required."),
  terminal_id: z.string().min(1, "Terminal ID is required."),
  merchant_name: z.string().min(1, "Merchant Name is required."),
  merchant_city: z.string().min(1, "Merchant City is required."),
  mcc: z.string().min(1, "MCC is required."),
  currency: z.string().optional(), // Not on form, but in settings
  currency_code: z.string().optional(), // Not on form, but in settings
  country_code: z.string().optional(), // Not on form, but in settings
  customer_email: z.string().optional(),
  customer_name: z.string().optional(),
});


export async function createTransaction(formData: FormData): Promise<Transaction> {
  const dataToParse = Object.fromEntries(formData.entries());
  console.log("Data being parsed:", dataToParse);
  const parsed = TransactionSchema.safeParse(dataToParse);

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

  // 2. Pre-save transaction object
  let pendingTx: Omit<Transaction, 'created_at' | 'updated_at'> = {
    transaction_id: `tx_${crypto.randomBytes(8).toString('hex')}`,
    transaction_uuid,
    status: "PENDING",
    qr_payload: "", // Will be filled after bank call
    expires_at: "", // Will be filled after bank call
    amount: data.amount,
    reference_number: data.reference_number,
    merchant_id: data.merchant_id,
    terminal_id: data.terminal_id, // Pass terminal_id
    currency: 'LKR'
  };

  // 3. Call Bank API to create QR
  const bankResponse = await callBankCreateQR({
    amount: data.amount,
    reference_number: data.reference_number,
    merchant_id: data.merchant_id,
    bank_code: data.bank_code,
    terminal_id: data.terminal_id,
    merchant_name: data.merchant_name,
    merchant_city: data.merchant_city,
    mcc: data.mcc,
    currency_code: data.currency_code ?? '144', // Default to LKR
    country_code: data.country_code ?? 'LK', // Default to LK
  });

  // 4. Update transaction with QR data from bank
  pendingTx.qr_payload = bankResponse.qr_payload;
  pendingTx.expires_at = bankResponse.expires_at;

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

  const webhookUrl = new URL('/api/bank/webhook', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002');
  
  await fetch(webhookUrl.toString(), {
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

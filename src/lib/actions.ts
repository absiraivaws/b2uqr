
'use server';

import { z } from "zod";
import type { Transaction, BankWebhookPayload } from "./types";
import {
  createDbTransaction,
  getDbTransaction,
  updateDbTransactionStatus,
  findPendingTransactions,
} from "./db";
import { callBankCreateQR } from "./bank-api";
import { verifyWebhookSignature } from "./security";
import { alertFailures, type AlertFailuresOutput } from "@/ai/flows/alert-failures";
import crypto from "crypto";


const TransactionSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
  reference_number: z.string(),
  // From settings
  merchant_id: z.string(),
  merchant_name: z.string(),
  merchant_city: z.string(),
  mcc: z.string(),
  currency_code: z.string(),
  bank_code: z.string(),
  terminal_id: z.string(),
  country_code: z.string(),
  currency: z.string(),
});

export async function createTransaction(formData: FormData): Promise<Transaction> {
  const parsed = TransactionSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((e) => e.message).join(", "));
  }
  const data = parsed.data;

  // 1. Generate transaction_uuid (if not already part of form)
   const transaction_uuid = `uuid_${crypto.randomBytes(12).toString('hex')}`;

  // 2. Persist transaction in Firestore with status: PENDING
  // This is a pre-save object. The actual DB layer will add created_at etc.
  let pendingTx: Omit<Transaction, 'created_at' | 'updated_at'> = {
    transaction_id: `tx_${crypto.randomBytes(8).toString('hex')}`,
    transaction_uuid,
    status: "PENDING",
    qr_payload: "", // Will be filled after bank call
    expires_at: "", // Will be filled after bank call
    amount: data.amount,
    reference_number: data.reference_number,
    merchant_id: data.merchant_id,
    currency: data.currency
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
    currency_code: data.currency_code,
    country_code: data.country_code,
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

// This function simulates the bank calling our webhook.
// It's a helper for the demo UI.
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
  };

  const rawBody = JSON.stringify(payload);
  const secret = process.env.BANK_WEBHOOK_SECRET || 'fake-webhook-secret';
  const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  // Simulate a fetch call to our own webhook endpoint
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
    
    // In LankaQR amount comparison needs to be precise
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

    // This is a mock reconciliation. In a real app, you'd call the bank's API.
    // Here we just fail them.
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

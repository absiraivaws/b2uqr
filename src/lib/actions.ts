
'use server';

import { z } from "zod";
import { format } from "date-fns";
import type { Transaction, BankWebhookPayload } from "./types";
import {
  createDbTransaction,
  getDbTransaction,
  updateDbTransactionStatus,
  findPendingTransactions,
} from "./db";
import { callBankCreateQR, callBankReconciliationAPI } from "./bank-api";
import { verifyWebhookSignature } from "./security";
import { alertFailures, type AlertFailuresOutput } from "@/ai/flows/alert-failures";
import crypto from "crypto";


const TransactionSchema = z.object({
  merchant_id: z.string(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
  currency: z.string().length(3),
  reference_number: z.string(),
  customer_email: z.string().optional(),
  customer_name: z.string().optional(),
  // For LankaQR
  merchant_name: z.string().optional(),
  merchant_city: z.string().optional(),
  mcc: z.string().optional(),
  currency_code: z.string().optional(),
});

export async function createTransaction(formData: FormData): Promise<Transaction> {
  const parsed = TransactionSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((e) => e.message).join(", "));
  }
  const data = parsed.data;

  // 1. Generate transaction_uuid
  const timestamp = format(new Date(), "yyyyMMdd");
  const randomPart = Math.floor(100000 + Math.random() * 900000);
  const transaction_uuid = `${timestamp}${randomPart}`;

  // 2. Persist transaction in Firestore with status: PENDING
  // This is a pre-save object. The actual DB layer will add created_at etc.
  let pendingTx: Omit<Transaction, 'created_at' | 'updated_at'> = {
    transaction_id: `tx_${crypto.randomBytes(8).toString('hex')}`,
    transaction_uuid,
    status: "PENDING",
    qr_payload: "", // Will be filled after bank call
    expires_at: "", // Will be filled after bank call
    ...data,
  };

  // 3. Call Bank API to create QR
  const bankResponse = await callBankCreateQR({
    transaction_uuid,
    amount: data.amount,
    reference_number: data.reference_number,
    merchant_id: data.merchant_id,
    merchant_name: data.merchant_name || 'My Store', // Fallback
    merchant_city: data.merchant_city || 'Colombo', // Fallback
    mcc: data.mcc || '5999', // Fallback
    currency_code: data.currency_code || '144' // LKR
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

    let reconciledCount = 0;
    for (const tx of pendingTxs) {
        const bankStatus = await callBankReconciliationAPI(tx.transaction_uuid);

        if (bankStatus && bankStatus.status !== 'PENDING') {
            console.log(`Reconciling ${tx.transaction_uuid} to ${bankStatus.status}`);
            await updateDbTransactionStatus(tx.transaction_uuid, bankStatus.status, { reconciled_at: new Date().toISOString() });
            reconciledCount++;
        }
    }
    
    if (reconciledCount < pendingTxs.length) {
         const alert = await alertFailures({
            failureType: 'Reconciliation Failure',
            details: `Found ${pendingTxs.length} stale transactions, but only reconciled ${reconciledCount}. ${pendingTxs.length - reconciledCount} transactions remain in a pending state at both our end and the bank's end after the timeout window.`,
        });
        return { message: `Reconciled ${reconciledCount} of ${pendingTxs.length} stale transactions. Some could not be resolved.`, alert };
    }

    return { message: `Reconciliation complete. Processed ${reconciledCount} stale transactions.` };
}

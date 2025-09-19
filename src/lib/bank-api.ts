// This file mocks the server-to-server API calls to the bank.

import crypto from 'crypto';

interface CreateQrRequest {
  transaction_uuid: string;
  amount: string;
  // ... other fields the bank requires
}

interface CreateQrResponse {
  qr_payload: string;
  qr_image_url?: string;
  expires_at: string;
  transaction_ref: string;
}

/**
 * Mocks calling the Bank's POST /v1/qr/create endpoint.
 * In a real scenario, this would involve HTTP requests, signing, etc.
 */
export async function callBankCreateQR(params: CreateQrRequest): Promise<CreateQrResponse> {
  console.log("Mock Bank API: Signing and calling /v1/qr/create with params:", params);

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Mocked signing process
  const secret = process.env.BANK_API_SECRET || "fake-secret-key";
  const signature = crypto.createHmac('sha256', secret).update(JSON.stringify(params)).digest('hex');
  console.log("Mock Bank API: Generated signature:", signature);

  // Mocked response from the bank
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + 10); // QR expires in 10 minutes

  return {
    qr_payload: `EMV-QR-PAYLOAD:uuid=${params.transaction_uuid}:amount=${params.amount}`,
    expires_at: expires.toISOString(),
    transaction_ref: `bank_ref_${Date.now()}`
  };
}

/**
 * Mocks calling a bank reconciliation API to check the status of a transaction.
 */
export async function callBankReconciliationAPI(uuid: string): Promise<{ status: 'SUCCESS' | 'FAILED' | 'PENDING' } | null> {
    console.log(`Mock Bank API: Reconciling status for ${uuid}`);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // In this mock, we'll randomly decide if a transaction has "settled" at the bank
    // This simulates finding a transaction that we missed the webhook for.
    const rand = Math.random();
    if (rand < 0.2) { // 20% chance it succeeded
        console.log(`Mock Bank API: Reconciled ${uuid} to SUCCESS`);
        return { status: 'SUCCESS' };
    } else if (rand < 0.3) { // 10% chance it failed
        console.log(`Mock Bank API: Reconciled ${uuid} to FAILED`);
        return { status: 'FAILED' };
    } else { // 70% chance it's still pending at the bank
        return { status: 'PENDING' };
    }
}

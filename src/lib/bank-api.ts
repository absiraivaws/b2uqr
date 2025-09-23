
// This file mocks the server-to-server API calls to the bank.
// It now includes a full implementation for LankaQR dynamic QR payload generation.

import crypto from 'crypto';

interface CreateQrRequest {
  transaction_uuid: string;
  amount: string;
  reference_number: string;
  // Merchant details that would typically come from settings or a database
  merchant_id: string; // From settings
  merchant_name: string; // From settings
  merchant_city: string; // From settings
  mcc: string; // From settings
  currency_code: string; // From settings
}

interface CreateQrResponse {
  qr_payload: string;
  qr_image_url?: string;
  expires_at: string;
  transaction_ref: string;
}

/**
 * Calculates CRC16 checksum based on the provided Java reference.
 * This is equivalent to CRC-16/KERMIT.
 * @param data The string to calculate the checksum for.
 * @returns A 4-character uppercase hex string representing the checksum.
 */
function crc16(data: string): string {
    let crc = 0xFFFF;
    const buffer = Buffer.from(data, 'utf-8');

    for (const byte of buffer) {
        crc = ((crc >>> 8) | (crc << 8)) & 0xFFFF;
        crc ^= byte;
        crc ^= (crc & 0xFF) >> 4;
        crc ^= (crc << 12) & 0xFFFF;
        crc ^= (crc & 0xFF) << 5;
    }
    crc &= 0xFFFF;
    return crc.toString(16).toUpperCase().padStart(4, '0');
}


function buildTag(tag: string, value: string | undefined | null): string {
  if (value === null || value === undefined || value === '') return '';
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

/**
 * Mocks calling the Bank's POST /v1/qr/create endpoint.
 * This function now constructs a valid LankaQR dynamic QR payload.
 */
export async function callBankCreateQR(params: CreateQrRequest): Promise<CreateQrResponse> {
  console.log("LankaQR Gen: Building QR payload with params:", params);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // --- LankaQR Payload Construction based on provided examples ---
  
  const merchantData: Record<string, {appId: string, merchantAccount: string}> = {
    'm_12345': { // Corresponds to LVMSiraiva
        appId: '4225800049969011',
        merchantAccount: '00281613500000000079600280050001'
    },
    'm_54321': { // Corresponds to AlbertBenigiusSiraiva
        appId: '4225800049968013',
        merchantAccount: '00281613500000000079600280040001'
    }
  }
  
  const selectedMerchant = merchantData[params.merchant_id] || merchantData['m_12345']; // Fallback


  const payloadIndicator = buildTag('00', '01');
  const pointOfInitiation = buildTag('01', '12'); // 12 for Dynamic QR
  
  const applicationIdentifier = buildTag('02', selectedMerchant.appId);
  const merchantAccountInformation = buildTag('26', selectedMerchant.merchantAccount);
  
  const merchantCategoryCode = buildTag('52', params.mcc);
  const transactionCurrency = buildTag('53', params.currency_code);
  const transactionAmount = buildTag('54', params.amount);
  const countryCode = buildTag('58', 'LK');
  const merchantName = buildTag('59', params.merchant_name);
  const merchantCity = buildTag('60', params.merchant_city);

  const additionalDataContent = buildTag('05', params.reference_number);
  const fullAdditionalDataTag = buildTag('62', additionalDataContent);

  const payloadWithoutCrc = [
    payloadIndicator,
    pointOfInitiation,
    applicationIdentifier,
    merchantAccountInformation,
    merchantCategoryCode,
    transactionCurrency,
    transactionAmount,
    countryCode,
    merchantName,
    merchantCity,
    fullAdditionalDataTag,
    '6304' // CRC Tag and Length placeholder
  ].join('');

  const crc = crc16(payloadWithoutCrc);
  const finalPayload = payloadWithoutCrc + crc;

  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + 10); // QR expires in 10 minutes

  return {
    qr_payload: finalPayload,
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

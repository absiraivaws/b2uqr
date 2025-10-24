
// This file mocks the server-to-server API calls to the bank.
// It now includes a full implementation for LankaQR dynamic QR payload generation.

interface CreateQrRequest {
  amount: string;
  reference_number: string;
  // Merchant details that would typically come from settings or a database
  merchant_id: string; // 19 digits
  bank_code: string; // 5 digits
  terminal_id: string; // 4 digits
  merchant_name: string; // max 25
  merchant_city: string; // max 15
  mcc: string; // 4 digits
  currency_code: string; // 3 digits (e.g. 144 for LKR)
  country_code: string; // 2 chars (e.g. LK)
}

interface CreateQrResponse {
  qr_payload: string;
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

  // --- LankaQR Payload Construction based on your requirements ---
  
  const payloadIndicator = buildTag('00', '01');
  const pointOfInitiation = buildTag('01', '12'); // 12 for Dynamic QR
  
  // Tag 02: Merchant ID / Network Reference (Fixed for LankaPay/People's Bank)
  const networkReference = buildTag('02', '4225800049969011');

  // Tag 26: Merchant Account Information
  const guid = '0028'; // GUID for People's Bank QR
  // Value = GUID (4) + Bank Code (5) + Merchant ID (19) + Terminal ID (4)
  const merchantInfoValue = `${guid}${params.bank_code}${params.merchant_id}${params.terminal_id}`;
  const merchantAccountInformation = buildTag('26', merchantInfoValue);
  
  const merchantCategoryCode = buildTag('52', params.mcc);
  const transactionCurrency = buildTag('53', params.currency_code);
  
  // Amount must be formatted to 2 decimal places.
  const formattedAmount = parseFloat(params.amount).toFixed(2);
  const transactionAmount = buildTag('54', formattedAmount);
  
  const countryCode = buildTag('58', params.country_code);
  const merchantName = buildTag('59', params.merchant_name);
  const merchantCity = buildTag('60', params.merchant_city);

  // Tag 62: Additional Data (with nested Reference Number for merchant and customer)
  const merchantReferenceLabel = buildTag('05', params.reference_number);
  const customerReferenceLabel = buildTag('06', params.reference_number);
  const additionalDataValue = `${merchantReferenceLabel}${customerReferenceLabel}`;
  const additionalData = buildTag('62', additionalDataValue);
  
  const payloadWithoutCrc = [
    payloadIndicator,
    pointOfInitiation,
    networkReference,
    merchantAccountInformation,
    merchantCategoryCode,
    transactionCurrency,
    transactionAmount,
    countryCode,
    merchantName,
    merchantCity,
    additionalData,
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
export async function callBankReconciliationAPI(uuid: string): Promise<{ status: 'PENDING' | 'SUCCESS' | 'FAILED' } | null> {
    console.log(`Mock Bank API: Reconciling status for ${uuid}`);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // In this mock, we'll randomly decide if a transaction has "settled" at the bank
    const rand = Math.random();
    if (rand < 0.7) { // 70% chance it succeeded
        console.log(`Mock Bank API: Reconciled ${uuid} to SUCCESS`);
        return { status: 'SUCCESS' };
    } else { // 30% chance it failed
        console.log(`Mock Bank API: Reconciled ${uuid} to FAILED`);
        return { status: 'FAILED' };
    }
}

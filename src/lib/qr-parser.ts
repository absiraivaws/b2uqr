/**
 * LankaQR EMV QR Code Parser
 * Parses LankaQR payment QR code strings according to EMV QR Code Specification
 */

export interface LankaQRData {
  merchant_id: string;
  bank_code: string;
  terminal_id: string;
  merchant_name: string;
  merchant_city: string;
  mcc: string;
  currency_code: string;
  country_code: string;
}

interface TLVEntry {
  tag: string;
  length: number;
  value: string;
}

/**
 * Parses TLV (Tag-Length-Value) structure from QR string
 * @param qrString - The QR code string to parse
 * @returns Map of tag to value
 */
function parseTLVStructure(qrString: string): Map<string, string> {
  const tlvMap = new Map<string, string>();
  let position = 0;

  while (position < qrString.length - 3) { // Need at least tag(2) + length(2)
    // Extract tag (2 digits)
    const tag = qrString.substring(position, position + 2);
    position += 2;

    // Extract length (2 digits)
    const lengthStr = qrString.substring(position, position + 2);
    const length = parseInt(lengthStr, 10);
    position += 2;

    if (isNaN(length) || length < 0) {
      console.warn(`Invalid length at position ${position - 2}: ${lengthStr}`);
      break;
    }

    // Extract value
    const value = qrString.substring(position, position + length);
    position += length;

    if (value.length !== length) {
      console.warn(`Value length mismatch for tag ${tag}: expected ${length}, got ${value.length}`);
      break;
    }

    tlvMap.set(tag, value);
  }

  return tlvMap;
}

/**
 * Extracts merchant account information from tag 26
 * Format: Sub-TLV containing bank_code, merchant_id, terminal_id
 */
function extractMerchantAccountInfo(tag26Value: string): {
  bank_code: string;
  merchant_id: string;
  terminal_id: string;
} | null {
  if (!tag26Value) return null;

  try {
    // Parse sub-TLV structure within tag 26
    const subTlvMap = parseTLVStructure(tag26Value);
    
    // Tag 00 contains: bank_code(5) + merchant_id(19) + terminal_id(4) = 28 digits
    const tag00Value = subTlvMap.get('00');
    if (!tag00Value || tag00Value.length !== 28) {
      console.warn('Tag 00 within tag 26 not found or invalid length');
      return null;
    }

    const bank_code = tag00Value.substring(0, 5);
    const merchant_id = tag00Value.substring(5, 24);
    const terminal_id = tag00Value.substring(24, 28);

    return { bank_code, merchant_id, terminal_id };
  } catch (error) {
    console.error('Error extracting merchant account info:', error);
    return null;
  }
}

/**
 * Parses a LankaQR payment QR code string
 * @param qrString - The QR code string to parse
 * @returns Parsed QR data or null if parsing fails
 */
export function parseLankaQR(qrString: string): LankaQRData | null {
  try {
    console.log('Parsing QR string:', qrString);
    
    // Parse the entire QR code into TLV map
    const tlvMap = parseTLVStructure(qrString);
    console.log('Parsed TLV map:', Object.fromEntries(tlvMap));

    // Extract merchant account information from tag 26
    const tag26Value = tlvMap.get('26');
    const merchantInfo = extractMerchantAccountInfo(tag26Value || '');
    console.log('Merchant info:', merchantInfo);
    
    if (!merchantInfo) {
      console.error('Failed to extract merchant account information');
      return null;
    }

    // Extract other fields from TLV map
    const merchant_name = tlvMap.get('59');
    const merchant_city = tlvMap.get('60');
    const mcc = tlvMap.get('52');
    const currency_code = tlvMap.get('53');
    const country_code = tlvMap.get('58');

    console.log('Extracted fields:', {
      merchant_name,
      merchant_city,
      mcc,
      currency_code,
      country_code
    });

    // Validate required fields
    if (!merchant_name || !merchant_city || !mcc || !currency_code || !country_code) {
      console.error('Missing required merchant fields in QR code', {
        merchant_name: !!merchant_name,
        merchant_city: !!merchant_city,
        mcc: !!mcc,
        currency_code: !!currency_code,
        country_code: !!country_code
      });
      return null;
    }

    return {
      merchant_id: merchantInfo.merchant_id,
      bank_code: merchantInfo.bank_code,
      terminal_id: merchantInfo.terminal_id,
      merchant_name,
      merchant_city,
      mcc,
      currency_code,
      country_code,
    };
  } catch (error) {
    console.error('Error parsing LankaQR code:', error);
    return null;
  }
}

/**
 * Validates a LankaQR code string format
 * @param qrString - The QR code string to validate
 * @returns true if the format appears valid
 */
export function validateLankaQRFormat(qrString: string): boolean {
  if (!qrString || typeof qrString !== 'string') return false;
  
  // Basic validation: check for required tags
  const requiredTags = ['01', '26', '52', '53', '58', '59', '60'];
  return requiredTags.every(tag => qrString.includes(tag));
}

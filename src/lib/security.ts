import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.BANK_WEBHOOK_SECRET || 'fake-webhook-secret';

/**
 * Mocks verifying the HMAC signature of an incoming webhook.
 * @param rawBody The raw, unparsed request body.
 * @param signature The signature from the X-Bank-Signature header.
 * @returns {boolean} True if the signature is valid, false otherwise.
 */
export async function verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean> {
  console.log("Verifying webhook signature...");
  
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  // Use crypto.timingSafeEqual for constant-time comparison to prevent timing attacks
  try {
    const sigBuffer = Buffer.from(signature);
    const expectedSigBuffer = Buffer.from(expectedSignature);
    const isVerified = crypto.timingSafeEqual(sigBuffer, expectedSigBuffer);
    
    if (isVerified) {
      console.log("Webhook signature is valid.");
    } else {
      console.warn("Webhook signature is INVALID.");
    }
    return isVerified;

  } catch (error) {
    console.error("Error during signature comparison:", error);
    return false;
  }
}

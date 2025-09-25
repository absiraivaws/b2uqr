
export interface Transaction {
  transaction_id: string;
  transaction_uuid: string;
  merchant_id: string;
  terminal_id?: string;
  amount: string;
  currency: string;
  reference_number: string;
  customer_email?: string;
  customer_name?: string;
  metadata?: Record<string, any>;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  qr_payload: string;
  qr_image_url?: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  bankResponse?: any;
}

export interface BankWebhookPayload {
  transaction_uuid: string;
  reference_number: string;
  amount: string;
  currency: string;
  status: 'SUCCESS' | 'FAILED';
  auth_code: string;
  paid_at: string;
  terminal_id?: string;
}

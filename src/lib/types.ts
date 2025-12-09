
export interface Transaction {
  transaction_id: string;
  transaction_uuid: string;
  merchant_id: string;
  merchant_name: string;
  merchant_city: string;
  uid?: string;
  companyId?: string;
  companySlug?: string;
  branchId?: string;
  branchSlug?: string;
  cashierId?: string;
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
  phppos_sale_id?: string | number | null;
  phppos_sale_total?: string | null;
  phppos_sale_recorded_at?: string | null;
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

export interface PhpposSale {
  sale_id?: number;
  total?: number | string;
  sale_time?: string;
  created_at?: string;
  updated_at?: string;
  receipt_url?: string;
  [key: string]: any;
}

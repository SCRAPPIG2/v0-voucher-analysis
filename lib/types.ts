// ============================================================
// TIPOS PARA CONTROLBANKDS
// ============================================================

export interface VoucherData {
  transaction_id: string | null;
  reference_number: string | null;
  bank_serial: string | null;
  bank_origin: string | null;
  bank_destination: string | null;
  amount: number | null;
  currency: string;
  issue_date: string | null;
  beneficiary: string | null;
  sender_name: string | null;
  transfer_type: string | null;
  payment_concept: string | null;
  raw_text?: string;
}

export interface FraudResult {
  fraudScore: number;
  fraudStatus: "CLEAN" | "SUSPICIOUS" | "DUPLICATE";
  fraudFlags: string[];
  duplicateOf: VoucherData | null;
}

export interface StoredVoucher extends VoucherData {
  id: number;
  created_at: string;
  updated_at: string;
  fraud_score: number;
  fraud_status: 'CLEAN' | 'SUSPICIOUS' | 'DUPLICATE';
  fraud_flags: string[];
}

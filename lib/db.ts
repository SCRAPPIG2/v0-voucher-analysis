import { neon } from '@neondatabase/serverless';
import type { VoucherData } from './types';

const sql = neon(process.env.DATABASE_URL || '');

export interface StoredVoucher extends VoucherData {
  id: number;
  fraud_status: 'CLEAN' | 'SUSPICIOUS' | 'DUPLICATE';
  fraud_score: number;
  fraud_flags: string[];
  whatsapp_number: string | null;
  created_at: string;
  updated_at: string;
}

export async function saveVoucher(
  data: VoucherData,
  fraudStatus: 'CLEAN' | 'SUSPICIOUS' | 'DUPLICATE',
  fraudScore: number,
  fraudFlags: string[],
  whatsappNumber?: string
): Promise<StoredVoucher> {
  try {
    const result = await sql`
      INSERT INTO vouchers (
        reference_number, transaction_id, bank_serial, bank_origin, bank_destination,
        transfer_type, amount, currency, issue_date, beneficiary, sender_name,
        payment_concept, fraud_status, fraud_score, fraud_flags, whatsapp_number
      ) VALUES (
        ${data.reference_number || null}, ${data.transaction_id || null}, ${data.bank_serial || null},
        ${data.bank_origin || null}, ${data.bank_destination || null}, ${data.transfer_type || null},
        ${data.amount || null}, ${data.currency || 'COP'}, ${data.issue_date || null},
        ${data.beneficiary || null}, ${data.sender_name || null}, ${data.payment_concept || null},
        ${fraudStatus}, ${fraudScore}, ${JSON.stringify(fraudFlags)}, ${whatsappNumber || null}
      )
      RETURNING *
    `;
    if (!result || result.length === 0) throw new Error('No se pudo guardar el voucher');
    return result[0] as StoredVoucher;
  } catch (error) {
    console.error('Error saving voucher:', error);
    throw error;
  }
}

export async function findDuplicateByReference(referenceNumber: string, bankOrigin?: string | null): Promise<StoredVoucher | null> {
  try {
    if (bankOrigin) {
      const result = await sql`SELECT * FROM vouchers WHERE reference_number = ${referenceNumber} AND bank_origin = ${bankOrigin} ORDER BY created_at DESC LIMIT 1`;
      return result && result.length > 0 ? (result[0] as StoredVoucher) : null;
    } else {
      const result = await sql`SELECT * FROM vouchers WHERE reference_number = ${referenceNumber} ORDER BY created_at DESC LIMIT 1`;
      return result && result.length > 0 ? (result[0] as StoredVoucher) : null;
    }
  } catch (error) {
    console.error('Error finding duplicate:', error);
    return null;
  }
}

export async function findDuplicateByTransactionId(transactionId: string): Promise<StoredVoucher | null> {
  try {
    const result = await sql`SELECT * FROM vouchers WHERE transaction_id = ${transactionId} ORDER BY created_at DESC LIMIT 1`;
    return result && result.length > 0 ? (result[0] as StoredVoucher) : null;
  } catch (error) {
    console.error('Error finding duplicate by transaction_id:', error);
    return null;
  }
}

export async function getAllVouchers(limit = 100): Promise<StoredVoucher[]> {
  try {
    const result = await sql`SELECT * FROM vouchers ORDER BY created_at DESC LIMIT ${limit}`;
    return (result || []) as StoredVoucher[];
  } catch (error) {
    console.error('Error getting vouchers:', error);
    throw error;
  }
}

export async function getVouchersByStatus(fraudStatus: 'CLEAN' | 'SUSPICIOUS' | 'DUPLICATE', limit = 100): Promise<StoredVoucher[]> {
  try {
    const result = await sql`SELECT * FROM vouchers WHERE fraud_status = ${fraudStatus} ORDER BY created_at DESC LIMIT ${limit}`;
    return (result || []) as StoredVoucher[];
  } catch (error) {
    console.error('Error getting vouchers by status:', error);
    throw error;
  }
}

export async function getFraudulentVouchers(): Promise<StoredVoucher[]> {
  try {
    const result = await sql`SELECT * FROM vouchers WHERE fraud_status IN ('DUPLICATE', 'SUSPICIOUS') ORDER BY fraud_score DESC, created_at DESC LIMIT 200`;
    return (result || []) as StoredVoucher[];
  } catch (error) {
    console.error('Error getting fraudulent vouchers:', error);
    throw error;
  }
}

export async function createFraudAlert(duplicateVoucherId: number, originalVoucherId: number, alertType: string, alertMessage: string, severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'): Promise<void> {
  try {
    await sql`INSERT INTO fraud_alerts (duplicate_voucher_id, original_voucher_id, alert_type, alert_message, alert_severity) VALUES (${duplicateVoucherId}, ${originalVoucherId}, ${alertType}, ${alertMessage}, ${severity})`;
  } catch (error) {
    console.error('Error creating fraud alert:', error);
  }
}

export async function getRecentAlerts(limit = 50): Promise<any[]> {
  try {
    const result = await sql`
      SELECT fa.*, v_dup.reference_number as duplicate_reference, v_orig.reference_number as original_reference
      FROM fraud_alerts fa
      LEFT JOIN vouchers v_dup ON fa.duplicate_voucher_id = v_dup.id
      LEFT JOIN vouchers v_orig ON fa.original_voucher_id = v_orig.id
      ORDER BY fa.created_at DESC LIMIT ${limit}
    `;
    return (result || []) as any[];
  } catch (error) {
    console.error('Error getting alerts:', error);
    throw error;
  }
}

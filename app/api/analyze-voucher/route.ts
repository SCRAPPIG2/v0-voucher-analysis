import { NextRequest, NextResponse } from 'next/server';
import { checkDuplicates } from '@/lib/fraud-detection';
import { saveVoucher, findDuplicateByReference, findDuplicateByTransactionId, createFraudAlert, getAllVouchers } from '@/lib/db';
import type { VoucherData } from '@/lib/types';

export const runtime = 'nodejs';

interface AnalyzeRequest {
  voucherData: VoucherData;
  whatsappNumber?: string;
  clientName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalyzeRequest;
    const { voucherData, whatsappNumber, clientName } = body;
    if (!voucherData) {
      return NextResponse.json({ error: 'No voucher data provided' }, { status: 400 });
    }
    const existingVouchers = await getAllVouchers(500);
    const fraudResult = checkDuplicates(voucherData, existingVouchers);
    const storedVoucher = await saveVoucher(voucherData, fraudResult.fraudStatus, fraudResult.fraudScore, fraudResult.fraudFlags, whatsappNumber, clientName);
    if (fraudResult.fraudStatus === 'DUPLICATE' && fraudResult.duplicateOf) {
      let originalVoucher = null;
      if (fraudResult.duplicateOf.reference_number) {
        originalVoucher = await findDuplicateByReference(fraudResult.duplicateOf.reference_number, fraudResult.duplicateOf.bank_origin);
      }
      if (!originalVoucher && fraudResult.duplicateOf.transaction_id) {
        originalVoucher = await findDuplicateByTransactionId(fraudResult.duplicateOf.transaction_id);
      }
      if (originalVoucher && originalVoucher.id !== storedVoucher.id) {
        await createFraudAlert(storedVoucher.id, originalVoucher.id, 'DUPLICATE', `Comprobante duplicado: ${voucherData.reference_number || voucherData.transaction_id}`, 'CRITICAL');
      }
    } else if (fraudResult.fraudStatus === 'SUSPICIOUS') {
      await createFraudAlert(storedVoucher.id, storedVoucher.id, 'SUSPICIOUS', fraudResult.fraudFlags.join(' | '), 'HIGH');
    }
    return NextResponse.json({
      success: true,
      voucher: storedVoucher,
      fraudAnalysis: {
        fraudStatus: fraudResult.fraudStatus,
        fraudScore: fraudResult.fraudScore,
        fraudFlags: fraudResult.fraudFlags,
        duplicateOf: fraudResult.duplicateOf,
      },
    });
  } catch (error) {
    console.error('Error analyzing voucher:', error);
    return NextResponse.json({ error: 'Failed to analyze voucher' }, { status: 500 });
  }
}

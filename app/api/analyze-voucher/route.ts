import { NextRequest, NextResponse } from 'next/server';
import { checkDuplicates } from '@/lib/fraud-detection';
import {
  saveVoucher,
  findDuplicateByReference,
  findDuplicateByTransactionId,
  createFraudAlert,
  getAllVouchers,
} from '@/lib/db';
import type { VoucherData } from '@/lib/types';

export const runtime = 'nodejs';

interface AnalyzeRequest {
  voucherData: VoucherData;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalyzeRequest;
    const { voucherData } = body;

    if (!voucherData) {
      return NextResponse.json(
        { error: 'No voucher data provided' },
        { status: 400 }
      );
    }

    // ── PASO 1: Traer vouchers existentes para comparar ──────────────
    // Sin esto, checkDuplicates nunca detecta nada (recibía array vacío)
    const existingVouchers = await getAllVouchers(500);

    // ── PASO 2: Detección de duplicados con datos reales de la BD ─────
    const fraudResult = checkDuplicates(voucherData, existingVouchers);

    // ── PASO 3: Guardar el nuevo voucher ──────────────────────────────
    const storedVoucher = await saveVoucher(
      voucherData,
      fraudResult.fraudStatus,
      fraudResult.fraudScore,
      fraudResult.fraudFlags
    );

    // ── PASO 4: Crear alertas si corresponde ──────────────────────────
    if (fraudResult.fraudStatus === 'DUPLICATE' && fraudResult.duplicateOf) {
      // Buscar el ID del voucher original en la DB por reference o transaction_id
      let originalVoucher = null;

      if (fraudResult.duplicateOf.reference_number) {
        originalVoucher = await findDuplicateByReference(
          fraudResult.duplicateOf.reference_number,
          fraudResult.duplicateOf.bank_origin
        );
      }

      if (!originalVoucher && fraudResult.duplicateOf.transaction_id) {
        originalVoucher = await findDuplicateByTransactionId(
          fraudResult.duplicateOf.transaction_id
        );
      }

      if (originalVoucher && originalVoucher.id !== storedVoucher.id) {
        await createFraudAlert(
          storedVoucher.id,
          originalVoucher.id,
          'DUPLICATE',
          `Comprobante duplicado: ${voucherData.reference_number || voucherData.transaction_id}`,
          'CRITICAL'
        );
      }
    } else if (fraudResult.fraudStatus === 'SUSPICIOUS') {
      await createFraudAlert(
        storedVoucher.id,
        storedVoucher.id,
        'SUSPICIOUS',
        fraudResult.fraudFlags.join(' | '),
        'HIGH'
      );
    }

    // ── PASO 5: Response con los campos que espera page.tsx ───────────
    // IMPORTANTE: page.tsx usa result.fraudAnalysis con fraudStatus/fraudScore/fraudFlags
    return NextResponse.json({
      success: true,
      voucher: storedVoucher,
      fraudAnalysis: {
        fraudStatus: fraudResult.fraudStatus,   // antes: status
        fraudScore: fraudResult.fraudScore,     // antes: score
        fraudFlags: fraudResult.fraudFlags,     // antes: flags
        duplicateOf: fraudResult.duplicateOf,
      },
    });
  } catch (error) {
    console.error('Error analyzing voucher:', error);
    return NextResponse.json(
      { error: 'Failed to analyze voucher' },
      { status: 500 }
    );
  }
}

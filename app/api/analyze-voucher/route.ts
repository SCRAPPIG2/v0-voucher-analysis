import { NextRequest, NextResponse } from 'next/server';
import { checkDuplicates } from '@/lib/fraud-detection';
import { saveVoucher, findDuplicateByReference, createFraudAlert } from '@/lib/db';
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

    // Realizar análisis de fraude (sin BD aun, solo logica)
    const fraudResult = checkDuplicates(voucherData);

    // Guardar en base de datos
    const storedVoucher = await saveVoucher(
      voucherData,
      fraudResult.fraudStatus,
      fraudResult.fraudScore,
      fraudResult.fraudFlags
    );

    // Si detectamos un duplicado, crear alerta
    if (
      fraudResult.fraudStatus === 'DUPLICATE' &&
      fraudResult.duplicateOf
    ) {
      // Buscar el ID del voucher original en la DB
      const originalVoucher = await findDuplicateByReference(
        fraudResult.duplicateOf.reference_number || '',
        fraudResult.duplicateOf.bank_origin
      );

      if (originalVoucher) {
        await createFraudAlert(
          storedVoucher.id,
          originalVoucher.id,
          'DUPLICATE',
          `Comprobante duplicado: ${voucherData.reference_number}`,
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

    return NextResponse.json({
      success: true,
      voucher: storedVoucher,
      fraudAnalysis: {
        status: fraudResult.fraudStatus,
        score: fraudResult.fraudScore,
        flags: fraudResult.fraudFlags,
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

import { NextRequest, NextResponse } from 'next/server';
import { checkDuplicates } from '@/lib/fraud-detection';
import { getAllVouchers, addVoucher } from '@/lib/memory-cache';
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

    // Obtener todos los vouchers existentes para comparacion
    const existingVouchers = getAllVouchers();
    const fraudResult = checkDuplicates(voucherData, existingVouchers);

    // Crear el voucher para guardar
    const voucherToStore = {
      ...voucherData,
      fraud_status: fraudResult.fraudStatus as 'CLEAN' | 'SUSPICIOUS' | 'DUPLICATE',
      fraud_score: fraudResult.fraudScore,
      fraud_flags: fraudResult.fraudFlags,
    };

    // Guardar en cache en memoria
    const storedVoucher = addVoucher(voucherToStore as any);

    return NextResponse.json({
      success: true,
      voucher: storedVoucher,
      fraudAnalysis: {
        status: fraudResult.fraudStatus,
        score: fraudResult.fraudScore,
        flags: fraudResult.fraudFlags,
      },
      stored: true,
    });
  } catch (error) {
    console.error('Error analyzing voucher:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to analyze voucher',
        success: false,
      },
      { status: 500 }
    );
  }
}

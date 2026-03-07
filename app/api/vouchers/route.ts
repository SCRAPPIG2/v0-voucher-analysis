import { NextRequest, NextResponse } from 'next/server';
import { getAllVouchers, getVouchersByStatus, getFraudulentVouchers } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filter = searchParams.get('filter') || 'all';
    const limit = parseInt(searchParams.get('limit') || '100');

    let vouchers;

    switch (filter) {
      case 'duplicates':
        vouchers = await getVouchersByStatus('DUPLICATE', limit);
        break;
      case 'suspicious':
        vouchers = await getVouchersByStatus('SUSPICIOUS', limit);
        break;
      case 'clean':
        vouchers = await getVouchersByStatus('CLEAN', limit);
        break;
      case 'fraud':
        vouchers = await getFraudulentVouchers();
        break;
      default:
        vouchers = await getAllVouchers(limit);
    }

    return NextResponse.json({
      success: true,
      count: vouchers.length,
      vouchers,
    });
  } catch (error) {
    console.error('Error fetching vouchers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vouchers' },
      { status: 500 }
    );
  }
}

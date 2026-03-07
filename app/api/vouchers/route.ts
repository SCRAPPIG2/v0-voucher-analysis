import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllVouchers, 
  getVouchersByStatus,
  getVoucherCount
} from '@/lib/memory-cache';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filter = searchParams.get('filter') || 'all';
    const limit = parseInt(searchParams.get('limit') || '100');

    let vouchers;

    switch (filter) {
      case 'duplicates':
        vouchers = getVouchersByStatus('DUPLICATE').slice(0, limit);
        break;
      case 'suspicious':
        vouchers = getVouchersByStatus('SUSPICIOUS').slice(0, limit);
        break;
      case 'clean':
        vouchers = getVouchersByStatus('CLEAN').slice(0, limit);
        break;
      default:
        vouchers = getAllVouchers().slice(0, limit);
    }

    return NextResponse.json({
      success: true,
      count: vouchers.length,
      total: getVoucherCount(),
      vouchers,
    });
  } catch (error) {
    console.error('Error fetching vouchers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vouchers', success: false },
      { status: 500 }
    );
  }
}

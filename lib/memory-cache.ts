import type { StoredVoucher } from './types';

// Cache compartido en memoria para todos los vouchers
// NOTA: Se reinicia con cada redeploy - usar Neon para persistencia real
let vouchersDatabase: StoredVoucher[] = [];

export function getAllVouchers(): StoredVoucher[] {
  return [...vouchersDatabase].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function getVouchersByStatus(status: 'CLEAN' | 'SUSPICIOUS' | 'DUPLICATE'): StoredVoucher[] {
  return getAllVouchers().filter(v => v.fraud_status === status);
}

export function addVoucher(voucher: StoredVoucher): StoredVoucher {
  const stored = {
    ...voucher,
    id: vouchersDatabase.length + 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  vouchersDatabase.push(stored);
  return stored;
}

export function clearAllVouchers(): void {
  vouchersDatabase = [];
}

export function getVoucherCount(): number {
  return vouchersDatabase.length;
}

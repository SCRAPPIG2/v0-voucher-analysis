import type { VoucherData, FraudResult, StoredVoucher } from "./types";

// ============================================================
// BASE DE DATOS LOCAL (en memoria - persiste durante la sesion)
// ============================================================
const DB: StoredVoucher[] = [];

export function getDatabase(): StoredVoucher[] {
  return DB;
}

export function checkDuplicates(data: VoucherData): FraudResult {
  const flags: string[] = [];
  let score = 0;
  let duplicateOf: VoucherData | null = null;

  for (const v of DB) {
    // CHECK 1: Transaction ID duplicado
    if (
      data.transaction_id &&
      v.transaction_id &&
      data.transaction_id.toLowerCase().trim() ===
        v.transaction_id.toLowerCase().trim()
    ) {
      score = 100;
      duplicateOf = v;
      flags.push(
        `Transaction ID "${data.transaction_id}" ya registrado el ${new Date(v.created_at).toLocaleDateString("es-CO")}`
      );
      break;
    }
    // CHECK 2: Mismo reference_number + banco
    if (
      !duplicateOf &&
      data.reference_number &&
      v.reference_number &&
      data.bank_origin &&
      v.bank_origin &&
      data.reference_number.toLowerCase().trim() ===
        v.reference_number.toLowerCase().trim() &&
      data.bank_origin.toLowerCase().trim() ===
        v.bank_origin.toLowerCase().trim()
    ) {
      score = Math.max(score, 90);
      duplicateOf = v;
      flags.push(
        `Referencia "${data.reference_number}" del banco "${data.bank_origin}" ya existe`
      );
    }
    // CHECK 3: Mismo serial
    if (
      !duplicateOf &&
      data.bank_serial &&
      v.bank_serial &&
      data.bank_serial.toLowerCase().trim() ===
        v.bank_serial.toLowerCase().trim()
    ) {
      score = Math.max(score, 90);
      duplicateOf = v;
      flags.push(`Serial "${data.bank_serial}" ya registrado`);
    }
    // CHECK 4: Mismo monto + beneficiario + fecha
    if (
      data.amount &&
      v.amount &&
      data.beneficiary &&
      v.beneficiary &&
      data.issue_date &&
      v.issue_date &&
      data.amount === v.amount &&
      data.beneficiary.toLowerCase().trim() ===
        v.beneficiary.toLowerCase().trim() &&
      data.issue_date === v.issue_date
    ) {
      score = Math.max(score, 60);
      duplicateOf = duplicateOf || v;
      flags.push(`Mismo monto y beneficiario en la misma fecha`);
    }
  }

  if (!data.transaction_id && !data.reference_number) {
    score = Math.max(score, 20);
    flags.push("Sin numero de transaccion — no se puede garantizar unicidad");
  }

  const fraudStatus: "CLEAN" | "SUSPICIOUS" | "DUPLICATE" =
    score >= 70 ? "DUPLICATE" : score >= 35 ? "SUSPICIOUS" : "CLEAN";

  return {
    fraudScore: Math.min(score, 100),
    fraudStatus,
    fraudFlags: flags,
    duplicateOf,
  };
}

export function saveVoucher(
  data: VoucherData,
  result: FraudResult
): StoredVoucher {
  const v: StoredVoucher = {
    ...data,
    id: Math.random().toString(36).slice(2),
    created_at: new Date().toISOString(),
    fraud_score: result.fraudScore,
    fraud_status: result.fraudStatus,
    fraud_flags: JSON.stringify(result.fraudFlags),
  };
  DB.push(v);
  return v;
}

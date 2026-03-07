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

  // Normalizar para comparacion
  const normalize = (s: string | null | undefined): string => 
    (s || '').toLowerCase().trim().replace(/\s+/g, '');

  for (const v of DB) {
    // CHECK 1: Reference/Comprobante duplicado (CRITICO - 100% fraude)
    if (
      data.reference_number &&
      v.reference_number &&
      normalize(data.reference_number) === normalize(v.reference_number)
    ) {
      score = 100;
      duplicateOf = v;
      flags.push(
        `ALERTA: Comprobante/Referencia "${data.reference_number}" YA REGISTRADO el ${new Date(v.created_at).toLocaleDateString("es-CO")}`
      );
      break; // No necesitamos mas checks
    }

    // CHECK 2: Transaction ID duplicado (CRITICO - 100% fraude)
    if (
      data.transaction_id &&
      v.transaction_id &&
      normalize(data.transaction_id) === normalize(v.transaction_id)
    ) {
      score = 100;
      duplicateOf = v;
      flags.push(
        `ALERTA: Transaction ID "${data.transaction_id}" YA REGISTRADO el ${new Date(v.created_at).toLocaleDateString("es-CO")}`
      );
      break;
    }

    // CHECK 3: Serial/Numero de cuenta duplicado
    if (
      data.bank_serial &&
      v.bank_serial &&
      normalize(data.bank_serial) === normalize(v.bank_serial)
    ) {
      score = Math.max(score, 95);
      duplicateOf = duplicateOf || v;
      flags.push(`Serial/Comprobante "${data.bank_serial}" ya registrado anteriormente`);
    }

    // CHECK 4: Mismo monto + beneficiario + fecha (MUY SOSPECHOSO)
    if (
      data.amount &&
      v.amount &&
      data.beneficiary &&
      v.beneficiary &&
      data.issue_date &&
      v.issue_date &&
      data.amount === v.amount &&
      normalize(data.beneficiary) === normalize(v.beneficiary) &&
      data.issue_date === v.issue_date
    ) {
      score = Math.max(score, 80);
      duplicateOf = duplicateOf || v;
      flags.push(`SOSPECHOSO: Mismo monto ($${data.amount.toLocaleString('es-CO')}) al mismo beneficiario (${data.beneficiary}) en la misma fecha`);
    }

    // CHECK 5: Mismo monto + fecha (diferente beneficiario) - posible split
    if (
      data.amount &&
      v.amount &&
      data.issue_date &&
      v.issue_date &&
      data.amount === v.amount &&
      data.issue_date === v.issue_date &&
      normalize(data.beneficiary) !== normalize(v.beneficiary)
    ) {
      score = Math.max(score, 40);
      flags.push(`Mismo monto en la misma fecha a diferente beneficiario`);
    }

    // CHECK 6: Mismo beneficiario multiples veces el mismo dia
    if (
      data.beneficiary &&
      v.beneficiary &&
      data.issue_date &&
      v.issue_date &&
      normalize(data.beneficiary) === normalize(v.beneficiary) &&
      data.issue_date === v.issue_date
    ) {
      score = Math.max(score, 30);
      flags.push(`Multiples transferencias al mismo beneficiario en el mismo dia`);
    }
  }

  // Penalizar si faltan datos criticos
  if (!data.reference_number && !data.transaction_id && !data.bank_serial) {
    score = Math.max(score, 50);
    flags.push("ADVERTENCIA: Sin numero de comprobante/referencia - imposible verificar unicidad");
  }

  const fraudStatus: "CLEAN" | "SUSPICIOUS" | "DUPLICATE" =
    score >= 80 ? "DUPLICATE" : score >= 30 ? "SUSPICIOUS" : "CLEAN";

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

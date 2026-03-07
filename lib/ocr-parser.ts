import type { VoucherData } from "./types";

// ============================================================
// MESES EN ESPANOL (completos y abreviados)
// ============================================================
const MESES: Record<string, string> = {
  enero: "01", ene: "01", feb: "02", febrero: "02",
  marzo: "03", mar: "03", abril: "04", abr: "04",
  mayo: "05", may: "05", junio: "06", jun: "06",
  julio: "07", jul: "07", agosto: "08", ago: "08",
  septiembre: "09", sep: "09", sept: "09",
  octubre: "10", oct: "10", noviembre: "11", nov: "11",
  diciembre: "12", dic: "12",
};

// ============================================================
// DETECTAR TIPO DE VOUCHER
// ============================================================
type VoucherType =
  | "bancolombia_transferencia"
  | "nequi"
  | "daviplata"
  | "redeban_corresponsal"
  | "generic";

function detectVoucherType(text: string): VoucherType {
  const t = text.toLowerCase();
  if (t.includes("redeban")) return "redeban_corresponsal";
  if (t.includes("corresponsal bancolombia") || t.includes("corresponsal\nbancolombia"))
    return "redeban_corresponsal";
  if (t.includes("transferencia exitosa") || t.includes("producto destino"))
    return "bancolombia_transferencia";
  if (t.includes("nequi") || t.includes("envio realizado")) return "nequi";
  if (t.includes("daviplata")) return "daviplata";
  return "generic";
}

// ============================================================
// PARSEO DE TEXTO OCR
// ============================================================
export function parseVoucherText(text: string): VoucherData {
  const normalizedText = text.replace(/\r\n/g, "\n").replace(/\n+/g, "\n");
  const voucherType = detectVoucherType(normalizedText);

  // Dispatch al parser correcto
  if (voucherType === "redeban_corresponsal") {
    return parseRedebanCorresponsal(normalizedText);
  }

  return parseStandard(normalizedText, voucherType);
}

// ============================================================
// PARSER: REDEBAN / CORRESPONSAL BANCOLOMBIA
// Ejemplo de campos:
//   MAR 07 2026 10:31:47 RBMDES 9.90
//   C.UNICO: 3007060703  TER: MA0D575
//   RECIBO: 059242       RRN: 062740
//   Producto: 3044550733
//   TITULAR: YONATAN ARISTIZABAL
//   RECARGA NEQU        APRO: 116333
//   VALOR               $ 207.950
// ============================================================
function parseRedebanCorresponsal(text: string): VoucherData {
  const find = (...patterns: RegExp[]): string | null => {
    for (const p of patterns) {
      const m = text.match(p);
      if (m?.[1]) return m[1].trim();
    }
    return null;
  };

  // MONTO
  const amountStr = find(
    /VALOR\s*\$?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})?)/i,
    /\$\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})?)/
  );
  let amount: number | null = null;
  if (amountStr) {
    const cleaned = amountStr.replace(/\./g, "").replace(",", ".");
    amount = parseFloat(cleaned);
    if (isNaN(amount)) amount = null;
  }

  // FECHA — "MAR 07 2026" o "MAR 07 2026 10:31:47"
  let issue_date: string | null = null;
  const fechaRedeban = text.match(
    /\b([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})\b/i
  );
  if (fechaRedeban) {
    const mesNombre = fechaRedeban[1].toLowerCase();
    const dia = fechaRedeban[2].padStart(2, "0");
    const ano = fechaRedeban[3];
    const mes = MESES[mesNombre];
    if (mes) issue_date = `${ano}-${mes}-${dia}`;
  }

  // RECIBO (referencia principal del comprobante)
  const recibo = find(/RECIBO[:\s#]*([0-9]{4,15})/i);

  // RRN (Reference Retrieval Number — único por red Redeban)
  const rrn = find(/RRN[:\s#]*([0-9]{4,15})/i);

  // APROBACION
  const aprobacion = find(/APRO(?:BACION)?[:\s#.]*([A-Z0-9]{4,15})/i);

  // C.UNICO / Código único de terminal
  const cunico = find(/C\.?\s*[UÚ]NICO[:\s]*([0-9]{6,15})/i);

  // TERMINAL ID
  const terminal = find(/TER(?:MINAL)?[:\s#]*([A-Z0-9]{4,15})/i);

  // PRODUCTO (número de celular Nequi o cuenta destino)
  const producto = find(/Producto[:\s]*([0-9]{7,15})/i);

  // TITULAR (quien hace la transaccion en el corresponsal)
  const titular = find(/TITULAR[:\s]*([A-Za-záéíóúñÁÉÍÓÚÑ\s]{3,60})(?:\n|$)/i);

  // TIPO DE OPERACION (ej: "RECARGA NEQU", "RETIRO", "DEPOSITO")
  const tipoOp = find(
    /\b(RECARGA\s+NEQ[UI]*|RECARGA\s+NEQUI|RETIRO|DEP[OÓ]SITO|PAGO\s+[A-Z]+)\b/i
  );

  // NOMBRE DEL COMERCIO CORRESPONSAL
  const comercio = find(
    /CORRESPONSAL\s+BANCOLOMBIA\s*\n([A-Z0-9\s]+?)(?:\n|CL|KR|AV|CALLE)/i
  );

  // Usar RRN como transaction_id (es el ID único de red más confiable)
  // y RECIBO como reference_number
  const transaction_id = rrn || recibo || aprobacion || null;
  const reference_number = recibo || rrn || null;
  const bank_serial = aprobacion || cunico || null;

  // Detectar banco destino según tipo de operación
  let bank_destination: string | null = null;
  if (tipoOp) {
    const t = tipoOp.toUpperCase();
    if (t.includes("NEQUI") || t.includes("NEQU")) bank_destination = "Nequi";
    else if (t.includes("DAVIPLATA")) bank_destination = "Daviplata";
  }

  // Tipo de transferencia
  let transfer_type: string | null = tipoOp || "Corresponsal Bancolombia";
  if (tipoOp?.toUpperCase().includes("RECARGA")) {
    transfer_type = `Recarga ${bank_destination || ""}`.trim();
  }

  return {
    transaction_id,
    reference_number,
    bank_serial,
    bank_origin: "Bancolombia Corresponsal",
    bank_destination,
    amount,
    currency: "COP",
    issue_date,
    beneficiary: titular || producto || null,
    sender_name: comercio || cunico || null,
    transfer_type,
    payment_concept: [
      tipoOp,
      producto ? `Producto: ${producto}` : null,
      terminal ? `Terminal: ${terminal}` : null,
    ]
      .filter(Boolean)
      .join(" | ") || null,
    raw_text: text,
  };
}

// ============================================================
// PARSER: ESTÁNDAR (Bancolombia transferencia, Nequi, genérico)
// ============================================================
function parseStandard(
  normalizedText: string,
  voucherType: VoucherType
): VoucherData {
  const find = (...patterns: RegExp[]): string | null => {
    for (const p of patterns) {
      const m = normalizedText.match(p);
      if (m?.[1]) return m[1].trim();
    }
    return null;
  };

  // MONTO
  const amountStr = find(
    /\$\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})?)/,
    /(?:Valor|Monto|Total|Importe|Cu[aá]nto\??)[:\s$COP]*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})?)/i,
    /COP\s*([0-9]{1,3}(?:[.,][0-9]{3})*)/i
  );
  let amount: number | null = null;
  if (amountStr) {
    const cleaned = amountStr.replace(/\./g, "").replace(",", ".");
    amount = parseFloat(cleaned);
    if (isNaN(amount)) amount = null;
  }

  // FECHA
  let issue_date: string | null = null;

  const fechaBancolombiaMatch = normalizedText.match(
    /(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/i
  );
  if (fechaBancolombiaMatch) {
    const dia = fechaBancolombiaMatch[1].padStart(2, "0");
    const mesNombre = fechaBancolombiaMatch[2].toLowerCase();
    const ano = fechaBancolombiaMatch[3];
    const mes = MESES[mesNombre];
    if (mes) issue_date = `${ano}-${mes}-${dia}`;
  }

  if (!issue_date) {
    const fechaTextoMatch = normalizedText.match(
      /(\d{1,2})\s*de\s*([a-záéíóú]+)\s*(?:de|del)?\s*(\d{4})/i
    );
    if (fechaTextoMatch) {
      const dia = fechaTextoMatch[1].padStart(2, "0");
      const mesNombre = fechaTextoMatch[2].toLowerCase();
      const ano = fechaTextoMatch[3];
      const mes = MESES[mesNombre];
      if (mes) issue_date = `${ano}-${mes}-${dia}`;
    }
  }

  if (!issue_date) {
    const rawDate = find(
      /(?:Fecha)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/,
      /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/
    );
    if (rawDate) {
      const p = rawDate.split(/[\/\-]/);
      if (p[0].length === 4) issue_date = rawDate;
      else {
        const y = p[2].length === 2 ? "20" + p[2] : p[2];
        issue_date = `${y}-${p[1].padStart(2, "0")}-${p[0].padStart(2, "0")}`;
      }
    }
  }

  // REFERENCIA
  const reference_number = find(
    /Comprobante\s*(?:No\.?|N[uú]mero)?[:\s]*([0-9]{6,15})/i,
    /Referencia[:\s]*([A-Z0-9]{5,20})/i,
    /(?:N[uú]m(?:ero)?\.?\s*(?:de\s*)?(?:referencia|aprobaci[oó]n))[:\s#]*([A-Z0-9\-]{4,20})/i,
    /(?:Aprobaci[oó]n|Auth|REF)[:\s.#]+([A-Z0-9\-]{4,20})/i,
    /\b([MN][0-9]{7,12})\b/i
  );

  // BENEFICIARIO
  const beneficiary = find(
    /Producto\s*destino[^\n]*\n\s*([A-Z]{2,}[A-Z\s]*)/i,
    /Para\s*\n?\s*([A-Za-záéíóúñÁÉÍÓÚÑ\s]{3,50}?)(?:\n|$)/i,
    /(?:Beneficiario|Destinatario|A\s*nombre\s*de)[:\s]*([A-Za-záéíóúñÁÉÍÓÚÑ\s]{3,50})(?:\n|,|$)/i,
    /(?:Nombre|Titular)[:\s]*([A-Za-záéíóúñÁÉÍÓÚÑ\s]{3,50})(?:\n|,|$)/i
  );

  // ACCOUNT / SERIAL
  const accountNumber = find(
    /([0-9]{3}\s*-\s*[0-9]{6}\s*-\s*[0-9]{2})/,
    /\*([0-9]{4})/,
    /N[uú]mero\s*Nequi[:\s]*([0-9\s]{10,15})/i,
    /(?:Celular|Tel[eé]fono|N[uú]mero)[:\s]*([0-9\s]{10,15})/i
  );
  const bank_serial =
    find(
      /Comprobante\s*(?:No\.?|N[uú]mero)?[:\s]*([0-9]{6,15})/i,
      /(?:Serial)[:\s#]*([A-Z0-9\-]{4,20})/i
    ) || (accountNumber ? accountNumber.replace(/\s/g, "") : null);

  // TRANSACTION ID
  const transaction_id =
    find(
      /(?:No\.?\s*(?:Transacci[oó]n|Operaci[oó]n|Confirmaci[oó]n)|Transaction\s*ID|CUS)[:\s#]*([A-Z0-9\-]{5,30})/i,
      /(?:C[oó]digo\s*[uú]nico|ID\s*operaci[oó]n)[:\s#]*([A-Z0-9\-]{5,30})/i
    ) || reference_number;

  // BANCO ORIGEN
  const detectBank = (): string | null => {
    const t = normalizedText.toLowerCase();
    if (voucherType === "bancolombia_transferencia") return "Bancolombia";
    if (voucherType === "nequi") return "Nequi";
    if (voucherType === "daviplata") return "Daviplata";
    const bankMatch = normalizedText.match(
      /(Bancolombia|Banco\s*de\s*Bogot[aá]|Davivienda|BBVA|Banco\s*Popular|Scotiabank|Colpatria|Caja\s*Social)/i
    );
    return bankMatch ? bankMatch[1] : null;
  };

  // TIPO TRANSFERENCIA
  const detectTransferType = (): string | null => {
    const t = normalizedText.toLowerCase();
    if (t.includes("transferencia exitosa") || t.includes("producto destino"))
      return "Transferencia Bancolombia";
    if (t.includes("envio realizado") || t.includes("nequi")) return "Envio Nequi";
    if (t.includes("daviplata")) return "Daviplata";
    if (t.includes("pse")) return "PSE";
    if (t.includes("ach")) return "ACH";
    if (t.includes("transfiya")) return "Transfiya";
    return null;
  };

  // ORDENANTE
  const sender_name = find(
    /(?:Ordenante|De|Pagador|Remitente)[:\s]*([A-Za-záéíóúñÁÉÍÓÚÑ\s]{3,50})(?:\n|,|$)/i,
    /(?:Desde|Origen)[:\s]*([A-Za-záéíóúñÁÉÍÓÚÑ\s]{3,50})(?:\n|,|$)/i
  );

  return {
    transaction_id,
    reference_number,
    bank_serial,
    bank_origin: detectBank(),
    bank_destination: find(
      /(?:Banco\s*destino)[:\s]*([A-Za-záéíóúñ\s]+?)(?:\n|,|$)/i
    ),
    amount,
    currency: "COP",
    issue_date,
    beneficiary,
    sender_name,
    transfer_type: detectTransferType(),
    payment_concept: find(
      /(?:Concepto|Descripci[oó]n|Motivo)[:\s]*(.{3,80})(?:\n|$)/i
    ),
    raw_text: normalizedText,
  };
}

import type { VoucherData } from "./types";

// ============================================================
// PARSEO DE TEXTO OCR
// ============================================================
export function parseVoucherText(text: string): VoucherData {
  const find = (...patterns: RegExp[]): string | null => {
    for (const p of patterns) {
      const m = text.match(p);
      if (m?.[1]) return m[1].trim();
    }
    return null;
  };

  const amountStr = find(
    /(?:Valor|Monto|Total|Importe)[:\s$COP]*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})?)/i,
    /\$\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})?)/,
    /COP\s*([0-9]{1,3}(?:[.,][0-9]{3})*)/i
  );
  let amount: number | null = null;
  if (amountStr) {
    amount = parseFloat(amountStr.replace(/\./g, "").replace(",", "."));
    if (isNaN(amount)) amount = null;
  }

  const rawDate = find(
    /(?:Fecha)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/,
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/
  );
  let issue_date: string | null = null;
  if (rawDate) {
    const p = rawDate.split(/[\/\-]/);
    if (p[0].length === 4) issue_date = rawDate;
    else {
      const y = p[2].length === 2 ? "20" + p[2] : p[2];
      issue_date = `${y}-${p[1].padStart(2, "0")}-${p[0].padStart(2, "0")}`;
    }
  }

  return {
    transaction_id: find(
      /(?:No\.?\s*(?:Transacci[oó]n|Operaci[oó]n|Confirmaci[oó]n)|Transaction\s*ID|CUS)[:\s#]*([A-Z0-9\-]{5,30})/i,
      /(?:C[oó]digo\s*[uú]nico|ID\s*operaci[oó]n)[:\s#]*([A-Z0-9\-]{5,30})/i
    ),
    reference_number: find(
      /(?:N[uú]m(?:ero)?\.?\s*(?:de\s*)?(?:referencia|aprobaci[oó]n))[:\s#]*([A-Z0-9\-]{4,20})/i,
      /(?:Aprobaci[oó]n|Auth|REF)[:\s.#]+([A-Z0-9\-]{4,20})/i
    ),
    bank_serial: find(
      /(?:Serial|Comprobante\s*N[oó]?)[:\s#]*([A-Z0-9\-]{4,20})/i
    ),
    bank_origin: find(
      /(?:Banco\s*(?:origen|emisor))[:\s]*([A-Za-záéíóúñ\s]+?)(?:\n|,|$)/i,
      /(Bancolombia|Banco\s*de\s*Bogot[aá]|Davivienda|BBVA|Banco\s*Popular|Scotiabank|Colpatria|Caja\s*Social|Nequi|Daviplata)/i
    ),
    bank_destination: find(
      /(?:Banco\s*destino)[:\s]*([A-Za-záéíóúñ\s]+?)(?:\n|,|$)/i
    ),
    amount,
    currency: "COP",
    issue_date,
    beneficiary: find(
      /(?:Beneficiario|Destinatario|A\s*nombre\s*de)[:\s]*([A-Za-záéíóúñ\s]{3,50})(?:\n|,|$)/i
    ),
    sender_name: find(
      /(?:Ordenante|De|Pagador|Remitente)[:\s]*([A-Za-záéíóúñ\s]{3,50})(?:\n|,|$)/i
    ),
    transfer_type: find(
      /(PSE|ACH|Nequi|Daviplata|Transfiya|Wire|Interbancaria)/i
    ),
    payment_concept: find(
      /(?:Concepto|Descripci[oó]n|Motivo)[:\s]*(.{3,80})(?:\n|$)/i
    ),
    raw_text: text,
  };
}

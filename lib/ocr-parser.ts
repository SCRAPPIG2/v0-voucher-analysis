import type { VoucherData } from "./types";

// ============================================================
// MESES EN ESPANOL
// ============================================================
const MESES: Record<string, string> = {
  enero: "01", febrero: "02", marzo: "03", abril: "04",
  mayo: "05", junio: "06", julio: "07", agosto: "08",
  septiembre: "09", octubre: "10", noviembre: "11", diciembre: "12"
};

// ============================================================
// PARSEO DE TEXTO OCR
// ============================================================
export function parseVoucherText(text: string): VoucherData {
  // Normalizar texto: eliminar saltos de linea extras y espacios multiples
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\n+/g, '\n');
  
  const find = (...patterns: RegExp[]): string | null => {
    for (const p of patterns) {
      const m = normalizedText.match(p);
      if (m?.[1]) return m[1].trim();
    }
    return null;
  };

  // ============================================================
  // MONTO - Buscar formato $ XX.XXX,XX o $ XX.XXX
  // ============================================================
  const amountStr = find(
    /\$\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})?)/,
    /(?:Valor|Monto|Total|Importe|Cu[aá]nto\??)[:\s$COP]*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})?)/i,
    /COP\s*([0-9]{1,3}(?:[.,][0-9]{3})*)/i
  );
  let amount: number | null = null;
  if (amountStr) {
    // Remover puntos de miles y cambiar coma decimal a punto
    const cleaned = amountStr.replace(/\./g, "").replace(",", ".");
    amount = parseFloat(cleaned);
    if (isNaN(amount)) amount = null;
  }

  // ============================================================
  // FECHA - Formatos: DD/MM/YYYY, DD de mes de YYYY, etc.
  // ============================================================
  let issue_date: string | null = null;
  
  // Formato Nequi: "06 de marzo de 2026 a las 03:50 p.m."
  const fechaTextoMatch = normalizedText.match(/(\d{1,2})\s*de\s*([a-záéíóú]+)\s*(?:de|del)?\s*(\d{4})/i);
  if (fechaTextoMatch) {
    const dia = fechaTextoMatch[1].padStart(2, "0");
    const mesNombre = fechaTextoMatch[2].toLowerCase();
    const ano = fechaTextoMatch[3];
    const mes = MESES[mesNombre];
    if (mes) {
      issue_date = `${ano}-${mes}-${dia}`;
    }
  }
  
  // Fallback: formato numerico DD/MM/YYYY o DD-MM-YYYY
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

  // ============================================================
  // REFERENCIA - Nequi usa "Referencia" seguido de codigo
  // ============================================================
  const reference_number = find(
    /Referencia[:\s]*([A-Z0-9]{5,20})/i,
    /(?:N[uú]m(?:ero)?\.?\s*(?:de\s*)?(?:referencia|aprobaci[oó]n))[:\s#]*([A-Z0-9\-]{4,20})/i,
    /(?:Aprobaci[oó]n|Auth|REF)[:\s.#]+([A-Z0-9\-]{4,20})/i,
    /\b([MN][0-9]{7,12})\b/i  // Codigos tipo M14046333
  );

  // ============================================================
  // BENEFICIARIO - Nequi usa "Para" seguido del nombre
  // ============================================================
  const beneficiary = find(
    /Para\s*\n?\s*([A-Za-záéíóúñÁÉÍÓÚÑ\s]{3,50}?)(?:\n|$)/i,
    /(?:Beneficiario|Destinatario|A\s*nombre\s*de)[:\s]*([A-Za-záéíóúñÁÉÍÓÚÑ\s]{3,50})(?:\n|,|$)/i,
    /(?:Nombre|Titular)[:\s]*([A-Za-záéíóúñÁÉÍÓÚÑ\s]{3,50})(?:\n|,|$)/i
  );

  // ============================================================
  // NUMERO NEQUI/CELULAR - Puede servir como identificador
  // ============================================================
  const nequiNumber = find(
    /N[uú]mero\s*Nequi[:\s]*([0-9\s]{10,15})/i,
    /(?:Celular|Tel[eé]fono|N[uú]mero)[:\s]*([0-9\s]{10,15})/i
  );
  
  // Usar numero Nequi como bank_serial si no hay otro
  const bank_serial = find(
    /(?:Serial|Comprobante\s*N[oó]?)[:\s#]*([A-Z0-9\-]{4,20})/i
  ) || (nequiNumber ? nequiNumber.replace(/\s/g, '') : null);

  // ============================================================
  // TRANSACTION ID
  // ============================================================
  const transaction_id = find(
    /(?:No\.?\s*(?:Transacci[oó]n|Operaci[oó]n|Confirmaci[oó]n)|Transaction\s*ID|CUS)[:\s#]*([A-Z0-9\-]{5,30})/i,
    /(?:C[oó]digo\s*[uú]nico|ID\s*operaci[oó]n)[:\s#]*([A-Z0-9\-]{5,30})/i
  ) || reference_number; // Usar referencia como fallback para transaction_id

  // ============================================================
  // BANCO ORIGEN - Detectar por nombre de app/banco
  // ============================================================
  const bank_origin = find(
    /(?:Banco\s*(?:origen|emisor))[:\s]*([A-Za-záéíóúñ\s]+?)(?:\n|,|$)/i,
    /(Bancolombia|Banco\s*de\s*Bogot[aá]|Davivienda|BBVA|Banco\s*Popular|Scotiabank|Colpatria|Caja\s*Social)/i
  ) || (normalizedText.toLowerCase().includes('nequi') ? 'Nequi' : null)
    || (normalizedText.toLowerCase().includes('daviplata') ? 'Daviplata' : null);

  // ============================================================
  // TIPO DE TRANSFERENCIA
  // ============================================================
  let transfer_type = find(
    /(PSE|ACH|Transfiya|Wire|Interbancaria)/i
  );
  if (!transfer_type) {
    if (normalizedText.toLowerCase().includes('nequi')) transfer_type = 'Nequi';
    else if (normalizedText.toLowerCase().includes('daviplata')) transfer_type = 'Daviplata';
    else if (normalizedText.toLowerCase().includes('env[ií]o')) transfer_type = 'Envio';
  }

  // ============================================================
  // ORDENANTE/REMITENTE
  // ============================================================
  const sender_name = find(
    /(?:Ordenante|De|Pagador|Remitente)[:\s]*([A-Za-záéíóúñÁÉÍÓÚÑ\s]{3,50})(?:\n|,|$)/i,
    /(?:Desde|Origen)[:\s]*([A-Za-záéíóúñÁÉÍÓÚÑ\s]{3,50})(?:\n|,|$)/i
  );

  return {
    transaction_id,
    reference_number,
    bank_serial,
    bank_origin,
    bank_destination: find(
      /(?:Banco\s*destino)[:\s]*([A-Za-záéíóúñ\s]+?)(?:\n|,|$)/i
    ),
    amount,
    currency: "COP",
    issue_date,
    beneficiary,
    sender_name,
    transfer_type,
    payment_concept: find(
      /(?:Concepto|Descripci[oó]n|Motivo)[:\s]*(.{3,80})(?:\n|$)/i
    ),
    raw_text: text,
  };
}

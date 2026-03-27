export interface ForensicResult {
  authenticityScore: number;
  isAuthentic: boolean;
  forensicFlags: string[];
  forensicDetails: {
    isScreenPhoto: boolean;
    isEdited: boolean;
    isFraudApp: boolean;
    hasValidQR: boolean;
    visualConsistency: boolean;
    beneficiaryMatch: boolean;
  };
}

export async function analyzeVoucherForensics(
  imageBase64: string,
  openaiApiKey: string,
  expectedBeneficiary?: string
): Promise<ForensicResult> {
  const prompt = `Analiza este comprobante bancario colombiano y responde SOLO con JSON valido, sin texto adicional:
{"authenticityScore":85,"isScreenPhoto":false,"isEdited":false,"isFraudApp":false,"hasValidQR":true,"visualConsistency":true,"beneficiaryMatch":true,"flags":[]}

Criterios:
- authenticityScore: 0-100 (100=autentico, 0=falso)
- isScreenPhoto: true si es foto de pantalla y no captura directa
- isEdited: true si fue editada con app
- isFraudApp: true si parece generada por NequiDz u app falsa
- hasValidQR: true si el QR es valido y legible
- visualConsistency: true si fuentes y colores son correctos para el banco
- beneficiaryMatch: true si el numero Nequi o cuenta coincide con ${expectedBeneficiary || 'no especificado'}
- flags: lista de problemas encontrados en español`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: 'low' } },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content.replace(/```json|```/g, '').trim());
    const flags: string[] = parsed.flags || [];

    if (parsed.isScreenPhoto) flags.push('Foto de pantalla detectada');
    if (parsed.isEdited) flags.push('Imagen editada - posible alteracion');
    if (parsed.isFraudApp) flags.push('Posible app fraudulenta (NequiDz u similar)');
    if (!parsed.hasValidQR) flags.push('QR invalido o ilegible');
    if (!parsed.visualConsistency) flags.push('Inconsistencias visuales detectadas');
    if (!parsed.beneficiaryMatch && expectedBeneficiary) flags.push('Beneficiario no coincide con la cuenta del negocio');

    return {
      authenticityScore: parsed.authenticityScore ?? 50,
      isAuthentic: (parsed.authenticityScore ?? 50) >= 70,
      forensicFlags: [...new Set(flags)],
      forensicDetails: {
        isScreenPhoto: parsed.isScreenPhoto ?? false,
        isEdited: parsed.isEdited ?? false,
        isFraudApp: parsed.isFraudApp ?? false,
        hasValidQR: parsed.hasValidQR ?? true,
        visualConsistency: parsed.visualConsistency ?? true,
        beneficiaryMatch: parsed.beneficiaryMatch ?? true,
      },
    };
  } catch {
    return {
      authenticityScore: 50,
      isAuthentic: false,
      forensicFlags: ['Error al procesar analisis forense'],
      forensicDetails: {
        isScreenPhoto: false,
        isEdited: false,
        isFraudApp: false,
        hasValidQR: true,
        visualConsistency: true,
        beneficiaryMatch: false,
      },
    };
  }
}

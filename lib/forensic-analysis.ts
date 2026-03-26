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
  const prompt = `Eres un experto en detección de fraude de comprobantes bancarios colombianos. Analiza esta imagen en detalle.

Debes detectar:
1. Es una foto de pantalla (no captura directa)? Busca: pixelado, reflejos, bordes curvos, fondo fisico
2. Fue editada con apps de edicion? Busca: inconsistencias en fuentes, colores alterados, texto superpuesto
3. Fue generada por app fraudulenta como NequiDz? Busca: proporciones incorrectas, colores distintos al original
4. El codigo QR es valido y legible? Corresponde a Nequi/Bancolombia real?
5. Las fuentes, colores, espaciado son consistentes con el banco real?
6. El beneficiario mostrado es: "${expectedBeneficiary || 'no especificado'}"?

Responde SOLO con este JSON sin texto adicional:
{
  "authenticityScore": 0,
  "isScreenPhoto": false,
  "isEdited": false,
  "isFraudApp": false,
  "hasValidQR": true,
  "visualConsistency": true,
  "beneficiaryMatch": true,
  "flags": []
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content.replace(/```json|```/g, '').trim());
    const flags: string[] = parsed.flags || [];

    if (parsed.isScreenPhoto) flags.push('Foto de pantalla detectada - no es captura directa');
    if (parsed.isEdited) flags.push('Imagen editada - posible alteracion de datos');
    if (parsed.isFraudApp) flags.push('Posible app fraudulenta (NequiDz u similar)');
    if (!parsed.hasValidQR) flags.push('QR invalido, ilegible o no corresponde al banco');
    if (!parsed.visualConsistency) flags.push('Inconsistencias visuales en fuentes, colores o proporciones');
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

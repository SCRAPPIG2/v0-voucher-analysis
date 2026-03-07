// ============================================================
// SERVICIO OCR CON PUTER.JS
// ============================================================

declare global {
  interface Window {
    puter?: {
      ai: {
        img2txt: (file: File) => Promise<string | { text: string }>;
      };
    };
  }
}

export function loadPuterScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.puter) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.puter.com/v2/";
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn("Puter.js no disponible en este entorno");
      resolve(false);
    };
    document.head.appendChild(script);
  });
}

export async function extractTextFromImage(
  imageDataUrl: string,
  puterReady: boolean
): Promise<string> {
  if (puterReady && window.puter) {
    const base64 = imageDataUrl.split(",")[1];
    const bytes = atob(base64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const file = new File([arr], "voucher.jpg", { type: "image/jpeg" });
    const result = await window.puter.ai.img2txt(file);
    return typeof result === "string" ? result : result?.text || "";
  }

  // Simulacion para demo cuando Puter.js no esta disponible
  await new Promise((r) => setTimeout(r, 1200));
  return `Bancolombia
Transferencia Exitosa
No. Transaccion: TXN-${Math.floor(Math.random() * 900000 + 100000)}
Valor: $1.500.000
Fecha: ${new Date().toLocaleDateString("es-CO")}
Beneficiario: Juan Carlos Perez
Ordenante: Maria Lopez
Concepto: Pago servicio`;
}

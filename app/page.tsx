"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { VoucherData, FraudResult, StoredVoucher } from "@/lib/types";
import {
  checkDuplicates,
  saveVoucher,
  getDatabase,
} from "@/lib/fraud-detection";
import { parseVoucherText } from "@/lib/ocr-parser";
import { loadPuterScript, extractTextFromImage } from "@/lib/puter-ocr";
import { DropZone } from "@/components/drop-zone";
import { ProgressStep } from "@/components/progress-step";
import { FraudBanner } from "@/components/fraud-banner";
import { DataField } from "@/components/data-field";
import { VoucherHistory } from "@/components/voucher-history";
import { Upload, History, Shield, Zap } from "lucide-react";

type Tab = "upload" | "historial";
type Step = "idle" | "ocr" | "parsing" | "checking" | "done";

export default function App() {
  const [tab, setTab] = useState<Tab>("upload");
  const [image, setImage] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [extracted, setExtracted] = useState<VoucherData | null>(null);
  const [fraud, setFraud] = useState<FraudResult | null>(null);
  const [history, setHistory] = useState<StoredVoucher[]>([]);
  const [puterReady, setPuterReady] = useState(false);

  // Cargar Puter.js
  useEffect(() => {
    loadPuterScript().then(setPuterReady);
  }, []);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      setExtracted(null);
      setFraud(null);
      setStep("idle");
    };
    reader.readAsDataURL(file);
  }, []);

  const analyze = async () => {
    if (!image) return;

    try {
      // PASO 1: OCR
      setStep("ocr");
      const text = await extractTextFromImage(image, puterReady);
      console.log("[v0] OCR RAW TEXT:", text);

      // PASO 2: Parsear
      setStep("parsing");
      await new Promise((r) => setTimeout(r, 400));
      const data = parseVoucherText(text);
      console.log("[v0] PARSED DATA:", data);
      setExtracted(data);

      // PASO 3: Verificar duplicados
      setStep("checking");
      await new Promise((r) => setTimeout(r, 500));
      const result = checkDuplicates(data);
      setFraud(result);

      // Guardar
      saveVoucher(data, result);
      setHistory([...getDatabase()].reverse());
      setStep("done");
    } catch (err) {
      console.error(err);
      setStep("idle");
    }
  };

  const tabs = [
    { id: "upload" as Tab, label: "Cargar Voucher", icon: Upload },
    {
      id: "historial" as Tab,
      label: `Historial (${history.length})`,
      icon: History,
    },
  ];

  return (
    <div className="min-h-screen bg-stone-100 font-sans text-stone-900">
      {/* HEADER */}
      <header className="bg-stone-900 text-stone-100 h-14 flex items-center justify-between px-7">
        <div className="font-mono text-sm font-semibold tracking-wider flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          CONTROL<span className="text-emerald-400">BANK</span>DS
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-stone-400">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          SISTEMA ACTIVO
        </div>
      </header>

      {/* TABS */}
      <nav className="bg-white border-b border-stone-200 flex px-7">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-5 py-4 text-sm font-medium transition-all border-b-2 -mb-px",
              tab === t.id
                ? "text-emerald-800 border-emerald-700"
                : "text-stone-500 border-transparent hover:text-stone-700"
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </nav>

      {/* ===================== TAB: UPLOAD ===================== */}
      {tab === "upload" && (
        <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          {/* IZQUIERDA */}
          <div>
            <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm">
              <div className="font-mono text-[10px] tracking-widest text-stone-500 uppercase mb-5 pb-4 border-b border-stone-100 flex items-center gap-2">
                <Upload className="w-3.5 h-3.5" />
                // Cargar Comprobante
              </div>

              <DropZone image={image} onFileSelect={handleFile} />

              {/* PROGRESO */}
              {step !== "idle" && step !== "done" && (
                <div className="mt-4">
                  <ProgressStep step={step as "ocr" | "parsing" | "checking"} />
                </div>
              )}

              <button
                onClick={analyze}
                disabled={!image || (step !== "idle" && step !== "done")}
                className={cn(
                  "w-full mt-4 py-3.5 rounded-lg font-mono text-xs font-semibold tracking-wider uppercase transition-all flex items-center justify-center gap-2",
                  image && (step === "idle" || step === "done")
                    ? "bg-emerald-800 text-white hover:bg-emerald-700 cursor-pointer"
                    : "bg-stone-200 text-stone-400 cursor-not-allowed"
                )}
              >
                <Zap className="w-4 h-4" />
                {step !== "idle" && step !== "done"
                  ? "PROCESANDO..."
                  : "ANALIZAR VOUCHER"}
              </button>

              {!puterReady && (
                <div className="mt-3 text-center text-[10px] text-stone-400 font-mono">
                  Modo demo — En produccion usara Puter.js OCR real
                </div>
              )}
            </div>
          </div>

          {/* DERECHA */}
          <div>
            {!fraud && step === "idle" && (
              <div className="bg-white border border-stone-200 rounded-lg p-16 text-center shadow-sm">
                <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-10 h-10 text-stone-300" />
                </div>
                <div className="font-mono text-sm text-stone-400">
                  Sube un comprobante para iniciar el analisis
                </div>
              </div>
            )}

            {fraud && extracted && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <FraudBanner fraud={fraud} />

                {/* CAMPOS EXTRAIDOS */}
                <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm">
                  <div className="font-mono text-[10px] tracking-widest text-stone-500 uppercase mb-4 pb-3 border-b border-stone-100">
                    // Datos Extraidos del Comprobante
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <DataField
                      label="Transaction ID"
                      value={extracted.transaction_id}
                      highlight
                    />
                    <DataField
                      label="Referencia"
                      value={extracted.reference_number}
                      highlight
                    />
                    <DataField
                      label="Banco Origen"
                      value={extracted.bank_origin}
                    />
                    <DataField
                      label="Banco Destino"
                      value={extracted.bank_destination}
                    />
                    <DataField
                      label="Monto"
                      value={
                        extracted.amount
                          ? `$${extracted.amount.toLocaleString("es-CO")} ${extracted.currency}`
                          : null
                      }
                      highlight
                    />
                    <DataField label="Fecha" value={extracted.issue_date} />
                    <DataField
                      label="Ordenante"
                      value={extracted.sender_name}
                    />
                    <DataField
                      label="Beneficiario"
                      value={extracted.beneficiary}
                    />
                    <DataField label="Tipo" value={extracted.transfer_type} />
                    <DataField label="Serial" value={extracted.bank_serial} />
                    <div className="col-span-2">
                      <DataField
                        label="Concepto"
                        value={extracted.payment_concept}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB: HISTORIAL ===================== */}
      {tab === "historial" && <VoucherHistory history={history} />}
    </div>
  );
}

"use client";

import { Loader2 } from "lucide-react";

interface ProgressStepProps {
  step: "ocr" | "parsing" | "checking" | "saving";
}

const steps = {
  ocr: "Leyendo imagen con Puter.js OCR...",
  parsing: "Extrayendo datos del comprobante...",
  checking: "Verificando duplicados en base de datos...",
  saving: "Guardando en base de datos...",
};

const progressWidth = {
  ocr: "25%",
  parsing: "50%",
  checking: "75%",
  saving: "95%",
};

export function ProgressStep({ step }: ProgressStepProps) {
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 text-emerald-700 animate-spin" />
        <span className="font-mono text-xs text-emerald-700">
          {steps[step]}
        </span>
      </div>
      <div className="h-1 bg-stone-200 rounded mt-3 overflow-hidden">
        <div
          className="h-full bg-emerald-700 rounded transition-all duration-500"
          style={{ width: progressWidth[step] }}
        />
      </div>
    </div>
  );
}

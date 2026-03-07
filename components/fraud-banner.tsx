"use client";

import { cn } from "@/lib/utils";
import type { FraudResult } from "@/lib/types";
import { AlertTriangle, ShieldCheck, ShieldX } from "lucide-react";

interface FraudBannerProps {
  fraud: FraudResult;
}

export function FraudBanner({ fraud }: FraudBannerProps) {
  const isDuplicate = fraud.fraudStatus === "DUPLICATE";
  const isSuspicious = fraud.fraudStatus === "SUSPICIOUS";
  const isClean = fraud.fraudStatus === "CLEAN";

  const Icon = isDuplicate ? ShieldX : isSuspicious ? AlertTriangle : ShieldCheck;

  return (
    <div
      className={cn(
        "rounded-lg p-5 mb-5 border-2",
        isDuplicate && "bg-red-50 border-red-400",
        isSuspicious && "bg-amber-50 border-amber-400",
        isClean && "bg-emerald-50 border-emerald-400"
      )}
    >
      <div
        className={cn(
          "font-mono text-sm font-bold mb-2 flex items-center gap-2",
          isDuplicate && "text-red-700",
          isSuspicious && "text-amber-700",
          isClean && "text-emerald-700"
        )}
      >
        <Icon className="w-5 h-5" />
        {isDuplicate
          ? "DUPLICADO DETECTADO — POSIBLE FRAUDE"
          : isSuspicious
            ? "VOUCHER SOSPECHOSO — REQUIERE REVISION"
            : "VOUCHER LIMPIO — REGISTRADO CORRECTAMENTE"}
      </div>

      {/* Score bar */}
      <div className="flex items-center gap-3 mb-3">
        <span className="font-mono text-[10px] text-stone-500 w-16">
          RIESGO
        </span>
        <div className="flex-1 h-1.5 bg-stone-200 rounded overflow-hidden">
          <div
            className={cn(
              "h-full rounded transition-all duration-700",
              isDuplicate && "bg-red-500",
              isSuspicious && "bg-amber-500",
              isClean && "bg-emerald-500"
            )}
            style={{ width: `${fraud.fraudScore}%` }}
          />
        </div>
        <span
          className={cn(
            "font-mono text-xs font-bold w-9 text-right",
            isDuplicate && "text-red-700",
            isSuspicious && "text-amber-700",
            isClean && "text-emerald-700"
          )}
        >
          {fraud.fraudScore}%
        </span>
      </div>

      {/* Flags */}
      <div className="space-y-1">
        {fraud.fraudFlags.map((f, i) => (
          <div key={i} className="font-mono text-xs text-stone-600">
            {"->"} {f}
          </div>
        ))}
        {!fraud.fraudFlags.length && (
          <div className="font-mono text-xs text-emerald-700">
            {"->"} No se encontraron senales de alerta
          </div>
        )}
      </div>

      {/* Info duplicado */}
      {fraud.duplicateOf && (
        <div className="mt-4 p-3 bg-white rounded border border-red-200">
          <div className="font-mono text-[11px] text-red-600 font-semibold mb-1">
            VOUCHER ORIGINAL:
          </div>
          <div className="font-mono text-[11px] text-stone-500">
            Banco: {fraud.duplicateOf.bank_origin || "N/A"} - Beneficiario:{" "}
            {fraud.duplicateOf.beneficiary || "N/A"} - Monto: $
            {fraud.duplicateOf.amount?.toLocaleString("es-CO") || "N/A"}
          </div>
        </div>
      )}
    </div>
  );
}

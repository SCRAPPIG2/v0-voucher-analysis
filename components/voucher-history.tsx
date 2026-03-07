"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { StoredVoucher } from "@/lib/types";
import { StatusBadge } from "./status-badge";
import { Filter } from "lucide-react";

interface VoucherHistoryProps {
  history: StoredVoucher[];
}

type FilterStatus = "ALL" | "DUPLICATE" | "SUSPICIOUS" | "CLEAN";

export function VoucherHistory({ history }: VoucherHistoryProps) {
  // Guarda defensiva: garantiza que siempre sea un array aunque llegue undefined
  const safeHistory = Array.isArray(history) ? history : [];

  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");

  const filteredHistory = safeHistory.filter(
    (v) => filterStatus === "ALL" || v.fraud_status === filterStatus
  );

  const counts = {
    ALL: safeHistory.length,
    DUPLICATE: safeHistory.filter((v) => v.fraud_status === "DUPLICATE").length,
    SUSPICIOUS: safeHistory.filter((v) => v.fraud_status === "SUSPICIOUS").length,
    CLEAN: safeHistory.filter((v) => v.fraud_status === "CLEAN").length,
  };

  const filters: { id: FilterStatus; label: string }[] = [
    { id: "ALL", label: `Todos (${counts.ALL})` },
    { id: "DUPLICATE", label: `Duplicados (${counts.DUPLICATE})` },
    { id: "SUSPICIOUS", label: `Sospechosos (${counts.SUSPICIOUS})` },
    { id: "CLEAN", label: `Limpios (${counts.CLEAN})` },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm">
        <div className="flex justify-between items-center mb-5 pb-4 border-b border-stone-100">
          <div className="font-mono text-[10px] tracking-widest text-stone-500 uppercase flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" />
            // Historial de Vouchers
          </div>
          {/* Filtros */}
          <div className="flex gap-2">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterStatus(f.id)}
                className={cn(
                  "px-3 py-1.5 text-[11px] font-mono rounded border transition-all",
                  filterStatus === f.id
                    ? "bg-emerald-800 text-white border-emerald-800"
                    : "bg-white text-stone-500 border-stone-200 hover:border-emerald-600"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-16 text-stone-400 font-mono text-sm">
            No hay vouchers registrados aun
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-stone-100">
                  {[
                    "Fecha",
                    "Banco",
                    "Transaction ID",
                    "Beneficiario",
                    "Monto",
                    "Estado",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left font-mono text-[9px] tracking-wider uppercase text-stone-500 font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((v) => (
                  <tr
                    key={v.id}
                    className={cn(
                      "border-b border-stone-100 transition-colors hover:bg-stone-50",
                      v.fraud_status === "DUPLICATE" && "bg-red-50/50",
                      v.fraud_status === "SUSPICIOUS" && "bg-amber-50/50"
                    )}
                  >
                    <td className="px-3 py-3 font-mono text-[11px] text-stone-500">
                      {new Date(v.created_at).toLocaleDateString("es-CO")}
                    </td>
                    <td className="px-3 py-3 font-medium">
                      {v.bank_origin || "-"}
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px] text-emerald-700">
                      {v.transaction_id || (
                        <span className="text-stone-300">No detectado</span>
                      )}
                    </td>
                    <td className="px-3 py-3">{v.beneficiary || "-"}</td>
                    <td className="px-3 py-3 font-mono font-semibold">
                      {v.amount ? `$${v.amount.toLocaleString("es-CO")}` : "-"}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={v.fraud_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

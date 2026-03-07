"use client";

import { cn } from "@/lib/utils";

interface DataFieldProps {
  label: string;
  value: string | null;
  highlight?: boolean;
}

export function DataField({ label, value, highlight }: DataFieldProps) {
  return (
    <div
      className={cn(
        "p-3 rounded border",
        highlight
          ? "bg-emerald-50 border-emerald-200"
          : "bg-stone-50 border-stone-200"
      )}
    >
      <div className="text-[9px] text-stone-500 tracking-widest uppercase mb-1 font-mono">
        {label}
      </div>
      <div
        className={cn(
          "text-[13px] font-mono break-all",
          value
            ? highlight
              ? "text-emerald-900 font-semibold"
              : "text-stone-900"
            : "text-stone-300"
        )}
      >
        {value || "No detectado"}
      </div>
    </div>
  );
}

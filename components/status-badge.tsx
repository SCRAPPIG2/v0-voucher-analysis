"use client";

import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
}

const statusConfig = {
  DUPLICATE: {
    bg: "bg-red-100",
    text: "text-red-700",
    label: "DUPLICADO",
  },
  SUSPICIOUS: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    label: "SOSPECHOSO",
  },
  CLEAN: {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    label: "LIMPIO",
  },
} as const;

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status as keyof typeof statusConfig] || {
    bg: "bg-muted",
    text: "text-muted-foreground",
    label: status,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider",
        config.bg,
        config.text
      )}
    >
      {config.label}
    </span>
  );
}

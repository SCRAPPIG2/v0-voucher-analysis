"use client";

import { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Upload, FileImage } from "lucide-react";

interface DropZoneProps {
  image: string | null;
  onFileSelect: (file: File) => void;
}

export function DropZone({ image, onFileSelect }: DropZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file?.type.startsWith("image/")) return;
      onFileSelect(file);
    },
    [onFileSelect]
  );

  return (
    <div
      onClick={() => fileRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
      }}
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer min-h-[200px] flex items-center justify-center flex-col gap-2 transition-all",
        dragOver
          ? "border-emerald-600 bg-emerald-50"
          : "border-stone-300 bg-stone-50 hover:border-emerald-600 hover:bg-emerald-50"
      )}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      {image ? (
        <img
          src={image}
          alt="voucher"
          className="max-w-full max-h-[220px] rounded"
        />
      ) : (
        <>
          <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mb-2">
            <FileImage className="w-8 h-8 text-stone-400" />
          </div>
          <div className="text-sm text-stone-500 font-medium">
            Arrastra el voucher aqui
          </div>
          <div className="text-xs text-stone-400 font-mono">
            JPG - PNG - WEBP
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700 font-medium">
            <Upload className="w-4 h-4" />
            Click para seleccionar
          </div>
        </>
      )}
    </div>
  );
}

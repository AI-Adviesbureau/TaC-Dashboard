"use client";

import { useState } from "react";
import { Info } from "lucide-react";

/** Klein info-icoon dat bij hover/focus een definitie toont (KPI-uitleg). */
export function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label="Uitleg"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="text-[var(--muted)] transition hover:text-[var(--brand-green)]"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span className="absolute left-1/2 top-6 z-40 w-60 -translate-x-1/2 rounded-xl border bg-[var(--surface)] p-3 text-left text-xs font-medium leading-relaxed text-[var(--text)] shadow-[var(--shadow-hover)] animate-in">
          {text}
        </span>
      )}
    </span>
  );
}

"use client";

import { useState } from "react";
import { Info } from "lucide-react";

/** Klein info-icoon dat bij hover/klik/focus een leesbare definitie toont. */
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
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="text-[var(--muted)] transition hover:text-[var(--brand-green)]"
      >
        <Info className="h-4 w-4" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-0 top-7 z-50 w-72 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 text-left text-[13px] font-medium leading-relaxed text-[var(--text)] shadow-[var(--shadow-hover)] animate-in"
        >
          {text}
        </span>
      )}
    </span>
  );
}

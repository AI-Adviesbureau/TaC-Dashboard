"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export function Select({
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full appearance-none rounded-xl border bg-[var(--surface)] py-2 pl-3 pr-9 text-sm font-semibold outline-none transition focus:border-[var(--brand-green)] focus:ring-4 focus:ring-[var(--brand-green-50)]",
          !value && "text-[var(--muted)]"
        )}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
    </div>
  );
}

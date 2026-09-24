"use client";

import { useFilters } from "@/components/filters/filter-context";
import { InfoTip } from "@/components/ui/info-tip";
import { DEFINITIES } from "@/lib/definitions";
import { cn } from "@/lib/cn";

/** Schakelaar voor de budgetbasis: toegekend incl. speling ↔ basisbudget (gemeente). */
export function BudgetBasisSwitch({ className }: { className?: string }) {
  const f = useFilters();
  const opties = [
    { key: "incl" as const, label: "Toegekend incl. speling" },
    { key: "basis" as const, label: "Basisbudget (gemeente)" },
  ];
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Budgetbasis</span>
      <div className="flex rounded-xl border bg-[var(--surface)] p-1 shadow-sm">
        {opties.map((o) => (
          <button
            key={o.key}
            onClick={() => f.setBudgetBasis(o.key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
              f.budgetBasis === o.key
                ? "bg-[var(--brand-yellow)] text-[var(--text)] shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      <InfoTip align="right" text={DEFINITIES.budgetBasis} />
    </div>
  );
}

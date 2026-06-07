"use client";

import { cn } from "@/lib/cn";

export interface BarItem {
  label: string;
  value: number;
  sub?: string;
}

/** Elegante horizontale balkenlijst (bijv. per gemeente of productcode). */
export function BarList({
  items,
  accent = "green",
  format = (v) => String(v),
  className,
  onItemClick,
}: {
  items: BarItem[];
  accent?: "green" | "blue" | "yellow";
  format?: (v: number) => string;
  className?: string;
  onItemClick?: (label: string) => void;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const color =
    accent === "blue"
      ? "var(--brand-blue)"
      : accent === "yellow"
        ? "var(--brand-yellow)"
        : "var(--brand-green)";
  const clickable = !!onItemClick;
  return (
    <div className={cn("space-y-2.5", className)}>
      {items.map((it) => (
        <div
          key={it.label}
          className={cn("group", clickable && "-mx-2 cursor-pointer rounded-lg px-2 py-1 transition hover:bg-[var(--surface-2)]")}
          onClick={clickable ? () => onItemClick(it.label) : undefined}
          title={clickable ? `Toon trajecten: ${it.label}` : undefined}
        >
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className={cn("truncate font-semibold", clickable && "group-hover:text-[var(--brand-green-700)]")}>
              {it.label}
            </span>
            <span className="shrink-0 tabular-nums text-[var(--muted)]">
              {format(it.value)}
              {it.sub && <span className="ml-1 text-xs">{it.sub}</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${(it.value / max) * 100}%`, background: color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

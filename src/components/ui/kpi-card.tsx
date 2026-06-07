import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import { Card } from "./card";
import { InfoTip } from "./info-tip";
import { Skeleton } from "./states";
import { cn } from "@/lib/cn";

export interface KpiTrend {
  /** Verschil t.o.v. vorige periode in procent (positief = stijging). */
  pct: number | null;
  /** Is een stijging "goed" (groen) of "slecht" (rood)? */
  goodWhenUp?: boolean;
  label?: string;
}

export function KpiCard({
  label,
  value,
  hint,
  definitie,
  icon: Icon,
  accent = "green",
  trend,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  definitie?: string;
  icon?: LucideIcon;
  accent?: "green" | "blue" | "yellow";
  trend?: KpiTrend;
  loading?: boolean;
}) {
  const accentVar =
    accent === "blue"
      ? "var(--brand-blue)"
      : accent === "yellow"
        ? "var(--brand-yellow)"
        : "var(--brand-green)";
  const accentBg =
    accent === "blue"
      ? "var(--brand-blue-50)"
      : accent === "yellow"
        ? "var(--brand-yellow-50)"
        : "var(--brand-green-50)";

  return (
    <Card className="group relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-hover)]">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-60 transition-transform duration-500 group-hover:scale-125"
        style={{ background: accentBg }}
      />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
            {label}
          </span>
          {definitie && <InfoTip text={definitie} />}
        </div>
        {Icon && (
          <span
            className="grid h-9 w-9 place-items-center rounded-xl"
            style={{ background: accentBg, color: accentVar }}
          >
            <Icon className="h-4.5 w-4.5" />
          </span>
        )}
      </div>

      <div className="relative mt-3">
        {loading ? (
          <Skeleton className="h-9 w-28" />
        ) : (
          <div className="text-3xl font-extrabold tracking-tight">{value}</div>
        )}
      </div>

      <div className="relative mt-2 flex items-center gap-2">
        {!loading && trend && trend.pct !== null && <TrendBadge trend={trend} />}
        {hint && <span className="text-xs text-[var(--muted)]">{hint}</span>}
      </div>
    </Card>
  );
}

function TrendBadge({ trend }: { trend: KpiTrend }) {
  const pct = trend.pct ?? 0;
  const up = pct > 0.05;
  const down = pct < -0.05;
  const goodWhenUp = trend.goodWhenUp ?? true;
  const positief = up ? goodWhenUp : down ? !goodWhenUp : true;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold",
        positief
          ? "bg-[var(--ok)]/12 text-[var(--ok)]"
          : "bg-[var(--bad)]/12 text-[var(--bad)]"
      )}
      title={trend.label}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(pct).toLocaleString("nl-NL", { maximumFractionDigits: 0 })}%
    </span>
  );
}

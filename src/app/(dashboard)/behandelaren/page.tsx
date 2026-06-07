"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { useApi } from "@/lib/use-api";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton, EmptyState } from "@/components/ui/states";
import { BarList } from "@/components/charts/bar-list";
import { fmtEuroKort, fmtMaanden, fmtGetal } from "@/lib/format";
import { cn } from "@/lib/cn";

interface BehRow {
  behandelaar: string;
  aantal: number;
  clienten: number;
  gem_dlt: number | null;
  inkoop: number;
  omzet: number;
}

type SortKey = "aantal" | "clienten" | "gem_dlt" | "inkoop" | "omzet";

export default function BehandelarenPage() {
  const [rol, setRol] = useState<"behandelaar" | "rb">("behandelaar");
  const [sort, setSort] = useState<SortKey>("aantal");
  const { data, loading, error } = useApi<BehRow[]>("/api/behandelaren", { rol });

  const rows = [...(data ?? [])].sort((a, b) => {
    const av = a[sort] ?? -Infinity;
    const bv = b[sort] ?? -Infinity;
    return (bv as number) - (av as number);
  });

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      {/* Rol-schakelaar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex rounded-xl border bg-[var(--surface)] p-1 shadow-sm">
          {(["behandelaar", "rb"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRol(r)}
              className={cn(
                "rounded-lg px-4 py-1.5 text-sm font-semibold transition",
                rol === r
                  ? "bg-[var(--brand-green)] text-white shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              )}
            >
              {r === "behandelaar" ? "Behandelaren" : "Regiebehandelaren"}
            </button>
          ))}
        </div>
        <p className="hidden text-xs text-[var(--muted)] sm:block">
          Initialen — koppeling naar namen wordt apart en intern beheerd
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border bg-[var(--brand-blue-50)]/60 p-3 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-blue-700)]" />
        <p className="text-[var(--muted)]">
          Dit overzicht is bedoeld als inzicht, niet als afrekening. Verschillen
          ontstaan mede door type zorg, productcode en cliëntpopulatie.
        </p>
      </div>

      {/* Topverdeling */}
      <Card className="animate-in">
        <CardHeader title="Aantal trajecten" subtitle={`Top 15 ${rol === "rb" ? "regiebehandelaren" : "behandelaren"}`} />
        <div className="px-5 pb-5 pt-3">
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : rows.length ? (
            <BarList
              accent="green"
              items={rows.slice(0, 15).map((r) => ({
                label: r.behandelaar,
                value: r.aantal,
                sub: r.gem_dlt != null ? `· ${fmtMaanden(r.gem_dlt)}` : undefined,
              }))}
              format={(v) => fmtGetal(v)}
            />
          ) : (
            <EmptyState />
          )}
        </div>
      </Card>

      {/* Tabel */}
      <Card className="overflow-hidden animate-in">
        <CardHeader title="Detailoverzicht" subtitle="Sorteer door op een kolomkop te klikken" />
        <div className="mt-3 overflow-x-auto">
          {error ? (
            <EmptyState title="Kon niet laden" hint={error} />
          ) : loading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState />
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-5 py-2.5 font-bold">{rol === "rb" ? "Regiebeh." : "Behandelaar"}</th>
                  <ThSort label="Trajecten" k="aantal" sort={sort} setSort={setSort} />
                  <ThSort label="Cliënten" k="clienten" sort={sort} setSort={setSort} />
                  <ThSort label="Gem. doorlooptijd" k="gem_dlt" sort={sort} setSort={setSort} />
                  <ThSort label="Inkoop" k="inkoop" sort={sort} setSort={setSort} />
                  <ThSort label="Omzet" k="omzet" sort={sort} setSort={setSort} />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.behandelaar} className="border-b border-[var(--border)]/60 transition hover:bg-[var(--surface-2)]/60">
                    <td className="px-5 py-2.5">
                      <Badge tone="blue">{r.behandelaar}</Badge>
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums font-semibold">{fmtGetal(r.aantal)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{fmtGetal(r.clienten)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{fmtMaanden(r.gem_dlt)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{fmtEuroKort(r.inkoop)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{fmtEuroKort(r.omzet)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}

function ThSort({
  label,
  k,
  sort,
  setSort,
}: {
  label: string;
  k: SortKey;
  sort: SortKey;
  setSort: (k: SortKey) => void;
}) {
  return (
    <th className="px-5 py-2.5 text-right font-bold">
      <button
        onClick={() => setSort(k)}
        className={cn("transition hover:text-[var(--text)]", sort === k && "text-[var(--brand-green-700)]")}
      >
        {label}
      </button>
    </th>
  );
}

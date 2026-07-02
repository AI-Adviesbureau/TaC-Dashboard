"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, ChevronDown, Search, X } from "lucide-react";
import { useOverviewFiltersOptional } from "@/components/filters/overview-filter-context";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/cn";

type Opties = { gemeenten: string[] };

export function GemeentePicker() {
  const ctx = useOverviewFiltersOptional();
  const opts = useApi<Opties>("/api/options");
  const [open, setOpen] = useState(false);
  const [zoek, setZoek] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = ctx?.gemeenten ?? [];
  const loading = opts.loading;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const gefilterd = useMemo(() => {
    const list = opts.data?.gemeenten ?? [];
    const q = zoek.trim().toLowerCase();
    if (!q) return list;
    return list.filter((g) => g.toLowerCase().includes(q));
  }, [opts.data?.gemeenten, zoek]);

  if (!ctx) return null;

  const { toggleGemeente, clearGemeenten, setGemeenten } = ctx;
  const actief = selected.length > 0;
  const label =
    selected.length === 0
      ? "Alle gemeenten"
      : selected.length === 1
        ? selected[0]
        : `${selected.length} gemeenten`;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex max-w-[11rem] items-center gap-2 rounded-xl border bg-[var(--surface)] px-3 py-2 text-sm font-semibold shadow-sm transition hover:border-[var(--brand-green)] sm:max-w-none",
          actief ? "text-[var(--text)]" : "text-[var(--muted)]"
        )}
        title="Filter op gemeente(n)"
      >
        <Building2 className="h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 origin-top-right rounded-2xl border bg-[var(--surface)] p-3 shadow-[var(--shadow-hover)] animate-in">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
              Gemeente
            </span>
            {actief && (
              <button
                onClick={clearGemeenten}
                className="flex items-center gap-1 text-xs font-semibold text-[var(--brand-green-700)] hover:underline"
              >
                <X className="h-3 w-3" /> wissen
              </button>
            )}
          </div>

          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="search"
              value={zoek}
              onChange={(e) => setZoek(e.target.value)}
              placeholder="Zoeken…"
              className="w-full rounded-lg border bg-[var(--surface)] py-1.5 pl-8 pr-2 text-xs outline-none focus:border-[var(--brand-green)]"
            />
          </div>

          <div className="mb-2 flex gap-1.5">
            <button
              onClick={() => setGemeenten(gefilterd)}
              disabled={!gefilterd.length}
              className="flex-1 rounded-lg bg-[var(--surface-2)] px-2 py-1 text-xs font-semibold transition hover:bg-[var(--brand-green-50)] disabled:opacity-40"
            >
              Alles
            </button>
            <button
              onClick={clearGemeenten}
              className="flex-1 rounded-lg bg-[var(--surface-2)] px-2 py-1 text-xs font-semibold transition hover:bg-[var(--brand-green-50)]"
            >
              Geen
            </button>
          </div>

          <ul className="max-h-56 space-y-0.5 overflow-y-auto">
            {loading ? (
              <li className="px-2 py-3 text-center text-xs text-[var(--muted)]">Laden…</li>
            ) : gefilterd.length ? (
              gefilterd.map((g) => {
                const checked = selected.includes(g);
                return (
                  <li key={g}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition hover:bg-[var(--surface-2)]",
                        checked && "bg-[var(--brand-green-50)]"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleGemeente(g)}
                        className="h-4 w-4 rounded border-[var(--border)] accent-[var(--brand-green)]"
                      />
                      <span className="truncate font-medium">{g}</span>
                    </label>
                  </li>
                );
              })
            ) : (
              <li className="px-2 py-3 text-center text-xs text-[var(--muted)]">
                Geen gemeenten gevonden
              </li>
            )}
          </ul>

          <p className="mt-2 text-[10px] text-[var(--muted)]">
            Meerdere gemeenten aanvinken om te combineren. Leeg = alle gemeenten.
          </p>
        </div>
      )}
    </div>
  );
}

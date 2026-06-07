"use client";

import { useEffect } from "react";
import { X, ArrowRight } from "lucide-react";
import type { TrajectRow } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { fmtDatum, fmtEuro, fmtMaanden } from "@/lib/format";

export function TrajectDetail({ row, onClose }: { row: TrajectRow; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border bg-[var(--surface)] shadow-[var(--shadow-hover)] animate-in sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Kop */}
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b bg-[var(--surface)] px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold tracking-tight">
                Cliënt {row.rel_nr ?? "—"}
              </h2>
              <Badge tone="blue">{row.jaar}</Badge>
              {row.lopend && <Badge tone="warn">lopend</Badge>}
            </div>
            <p className="mt-0.5 text-sm text-[var(--muted)]">
              {row.gemeente ?? "—"} · {row.regio} · code {row.code ?? "—"}
              {row.code_omschrijving ? ` · ${row.code_omschrijving}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface-2)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Tijdlijn */}
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
              Tijdlijn
            </h3>
            <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-2)] p-4">
              <div className="text-center">
                <p className="text-xs text-[var(--muted)]">Intake / start</p>
                <p className="font-bold">{fmtDatum(row.intake)}</p>
              </div>
              <div className="flex flex-1 flex-col items-center text-[var(--brand-green)]">
                <span className="text-xs font-bold">{fmtMaanden(row.doorlooptijd)}</span>
                <ArrowRight className="h-5 w-5" />
                {row.norm_maanden != null && (
                  <span className="mt-0.5 text-[10px] font-semibold text-[var(--muted)]">
                    norm {fmtMaanden(row.norm_maanden)}
                  </span>
                )}
              </div>
              <div className="text-center">
                <p className="text-xs text-[var(--muted)]">Einde</p>
                <p className="font-bold">{row.eind ? fmtDatum(row.eind) : "—"}</p>
              </div>
            </div>
          </div>

          {/* Bedragen */}
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
              Financieel
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Beschikt budget" value={fmtEuro(row.omzet, true)} />
              <Stat label="Gerealiseerd" value={fmtEuro(row.gerealiseerd, true)} />
              <Stat label="Inkoopkosten" value={fmtEuro(row.inkoop, true)} />
              <Stat label="20% overhead" value={fmtEuro(row.overhead, true)} />
              <Stat label="Marge" value={fmtEuro(row.marge, true)} tone={row.marge >= 0 ? "ok" : "bad"} />
              <Stat label="Openstaand" value={fmtEuro(row.openstaand, true)} tone={row.openstaand > 0 ? "warn" : "ok"} />
            </div>
            <div className="mt-3 flex items-center gap-2">
              {row.betaald ? (
                <Badge tone="ok">Betaald</Badge>
              ) : row.openstaand > 0 ? (
                <Badge tone="warn">Openstaand</Badge>
              ) : (
                <Badge tone="neutral">Geen status</Badge>
              )}
              <span className="text-xs text-[var(--muted)]">
                Behandelaar {row.behandelaar ?? "—"}
                {row.rb ? ` · RB ${row.rb}` : ""}
              </span>
            </div>
          </div>

          <p className="text-xs text-[var(--muted)]">
            Bedragen samengevoegd over alle jaren van dit traject. Pseudonieme
            weergave — geen naam of BSN.
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "bad";
}) {
  const color =
    tone === "ok"
      ? "text-[var(--ok)]"
      : tone === "warn"
        ? "text-[var(--warn)]"
        : tone === "bad"
          ? "text-[var(--bad)]"
          : "";
  return (
    <div className="rounded-xl border bg-[var(--surface)] p-3">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className={`mt-0.5 font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { InfoTip } from "@/components/ui/info-tip";
import { DEFINITIES } from "@/lib/definitions";
import { fmtEuro, fmtGetal, fmtProcent } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { GemeentePrognoseRow } from "@/lib/kpi";

export function GemeentePrognoseTable({ rows }: { rows: GemeentePrognoseRow[] }) {
  const router = useRouter();
  const totaal = rows.reduce(
    (acc, r) => ({
      aantal: acc.aantal + r.aantal,
      lopend: acc.lopend + r.lopend,
      aangevraagd: acc.aangevraagd + r.aangevraagd,
      gedeclareerd: acc.gedeclareerd + r.gedeclareerd,
      resterend: acc.resterend + r.resterend,
      prognose: acc.prognose + r.prognose,
      prognose_resterend: acc.prognose_resterend + r.prognose_resterend,
    }),
    {
      aantal: 0,
      lopend: 0,
      aangevraagd: 0,
      gedeclareerd: 0,
      resterend: 0,
      prognose: 0,
      prognose_resterend: 0,
    }
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
            <th className="px-3 py-2">Gemeente</th>
            <th className="px-3 py-2 text-right">Trajecten</th>
            <th className="px-3 py-2 text-right">
              <span className="inline-flex items-center justify-end gap-1">
                Aangevraagd <InfoTip align="right" text={DEFINITIES.aangevraagdBudget} />
              </span>
            </th>
            <th className="px-3 py-2 text-right">
              <span className="inline-flex items-center justify-end gap-1">
                Gedeclareerd <InfoTip align="right" text={DEFINITIES.gedeclareerdBudget} />
              </span>
            </th>
            <th className="px-3 py-2 text-right">
              <span className="inline-flex items-center justify-end gap-1">
                Resterend <InfoTip align="right" text={DEFINITIES.budgetResterend} />
              </span>
            </th>
            <th className="px-3 py-2 text-right">
              <span className="inline-flex items-center justify-end gap-1">
                Prognose <InfoTip align="right" text={DEFINITIES.budgetPrognose} />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <PrognoseRij
              key={r.gemeente}
              row={r}
              onClick={() => router.push(`/trajecten?gemeente=${encodeURIComponent(r.gemeente)}`)}
            />
          ))}
        </tbody>
        {rows.length > 1 && (
          <tfoot>
            <tr className="border-t bg-[var(--surface-2)]/60 font-bold">
              <td className="px-3 py-2.5">Totaal selectie</td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {fmtGetal(totaal.aantal)}
                {totaal.lopend > 0 && (
                  <span className="ml-1 text-xs font-semibold text-[var(--muted)]">
                    ({fmtGetal(totaal.lopend)} lopend)
                  </span>
                )}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">{fmtEuro(totaal.aangevraagd)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{fmtEuro(totaal.gedeclareerd)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                <ResterendWaarde waarde={totaal.resterend} basis={totaal.aangevraagd} />
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                <PrognoseWaarde
                  prognose={totaal.prognose}
                  aangevraagd={totaal.aangevraagd}
                  resterend={totaal.prognose_resterend}
                />
              </td>
            </tr>
          </tfoot>
        )}
      </table>
      <p className="mx-3 mt-3 border-t pt-3 text-xs leading-relaxed text-[var(--muted)]">
        <strong className="text-[var(--text)]">Resterend</strong> = aangevraagd − gedeclareerd.{" "}
        <strong className="text-[var(--text)]">Prognose</strong> = verwacht eindtotaal; het
        percentage daaronder is prognose ÷ aangevraagd. &quot;Nog …&quot; is wat er op papier over
        blijft na die prognose (negatief = overschrijding verwacht).
      </p>
    </div>
  );
}

function PrognoseRij({
  row,
  onClick,
}: {
  row: GemeentePrognoseRow;
  onClick: () => void;
}) {
  const pct =
    row.aangevraagd > 0
      ? Math.min(100, (row.gedeclareerd / row.aangevraagd) * 100)
      : null;
  const tone =
    pct === null
      ? "var(--brand-blue)"
      : pct > 100
        ? "var(--bad)"
        : pct > 90
          ? "var(--warn)"
          : "var(--ok)";

  return (
    <tr
      className="group cursor-pointer border-b border-[var(--border)]/60 transition hover:bg-[var(--brand-green-50)]/40"
      onClick={onClick}
    >
      <td className="px-3 py-3">
        <div className="font-semibold">{row.gemeente}</div>
        {row.aangevraagd > 0 && (
          <div className="mt-1.5 h-1.5 max-w-[140px] overflow-hidden rounded-full bg-[var(--surface-2)]">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct ?? 0}%`, background: tone }}
            />
          </div>
        )}
      </td>
      <td className="px-3 py-3 text-right tabular-nums">
        {fmtGetal(row.aantal)}
        {row.lopend > 0 && (
          <div className="text-xs font-medium text-[var(--muted)]">
            {fmtGetal(row.lopend)} lopend
          </div>
        )}
      </td>
      <td className="px-3 py-3 text-right tabular-nums">
        {row.aangevraagd > 0 ? fmtEuro(row.aangevraagd) : "—"}
      </td>
      <td className="px-3 py-3 text-right tabular-nums">{fmtEuro(row.gedeclareerd)}</td>
      <td className="px-3 py-3 text-right tabular-nums">
        <ResterendWaarde waarde={row.resterend} basis={row.aangevraagd} />
      </td>
      <td className="px-3 py-3 text-right tabular-nums">
        <PrognoseWaarde
          prognose={row.prognose}
          aangevraagd={row.aangevraagd}
          resterend={row.prognose_resterend}
        />
      </td>
    </tr>
  );
}

function ResterendWaarde({ waarde, basis }: { waarde: number; basis: number }) {
  if (basis <= 0) return <span className="text-[var(--muted)]">n.t.b.</span>;
  const tone =
    waarde < 0 ? "text-[var(--bad)]" : waarde < basis * 0.1 ? "text-[var(--warn)]" : "text-[var(--text)]";
  return <span className={cn("font-semibold", tone)}>{fmtEuro(waarde)}</span>;
}

function PrognoseWaarde({
  prognose,
  aangevraagd,
  resterend,
}: {
  prognose: number;
  aangevraagd: number;
  resterend: number;
}) {
  const pct = aangevraagd > 0 ? (prognose / aangevraagd) * 100 : null;
  return (
    <div>
      <div className="font-semibold">{fmtEuro(prognose)}</div>
      {aangevraagd > 0 && (
        <div className="text-xs text-[var(--muted)]">
          {fmtProcent(pct ?? 0, 0)} van aangevraagd · nog {fmtEuro(resterend)}
        </div>
      )}
    </div>
  );
}

"use client";

import { Coins, Users, Wallet, Target, Landmark, Info } from "lucide-react";
import { useApi } from "@/lib/use-api";
import { useFilters } from "@/components/filters/filter-context";
import { useOverviewFilters } from "@/components/filters/overview-filter-context";
import { BudgetBasisSwitch } from "@/components/filters/budget-basis-switch";
import { KpiCard } from "@/components/ui/kpi-card";
import { Card, CardHeader } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { Skeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { CumulatiefChart } from "@/components/charts/cumulatief-chart";
import { ClientenMaandChart } from "@/components/charts/clienten-maand-chart";
import { DEFINITIES } from "@/lib/definitions";
import { MAAND_NAMEN_VOL } from "@/lib/types";
import { fmtEuro, fmtEuroKort, fmtGetal, fmtProcent } from "@/lib/format";
import type { MonitorData } from "@/lib/monitor";
import { cn } from "@/lib/cn";

export default function JeugdmonitorPage() {
  const f = useFilters();
  const { gemeenten } = useOverviewFilters();
  const extra = gemeenten.length ? { gemeente: gemeenten } : undefined;
  const { data, loading, error } = useApi<MonitorData>("/api/monitor", extra);

  const d = data;
  const h = d?.huidig;
  const tmLabel = d ? MAAND_NAMEN_VOL[d.tm - 1].toLowerCase() : "";
  const nietNoord = f.regio !== "Noord-Limburg";

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      {/* Context */}
      <div className="flex flex-wrap items-center justify-between gap-3 animate-in">
        <p className="text-sm text-[var(--muted)]">
          Zelfde definities als het gemeentedashboard (Jeugdmonitor, Sociaal Domein Limburg-Noord).
          {d && (
            <>
              {" "}
              Stand: <span className="font-semibold text-[var(--text)]">{d.jaar} t/m {tmLabel}</span>
              {d.tmAutomatisch && (
                <span className="ml-1 text-xs">(automatisch — kies een maand in de periodekiezer om te wijzigen)</span>
              )}
            </>
          )}
        </p>
        <BudgetBasisSwitch />
        {nietNoord && (
          <button
            onClick={() => f.setRegio("Noord-Limburg")}
            className="flex items-center gap-2 rounded-xl border border-[var(--brand-yellow)]/40 bg-[var(--brand-yellow-50)] px-3 py-2 text-sm font-semibold text-[var(--warn)] transition hover:brightness-95"
          >
            <Info className="h-4 w-4" />
            Gemeentedashboard dekt alleen Noord-Limburg — zet regio op Noord
          </button>
        )}
      </div>

      {/* KPI's */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Realisatie"
          icon={Coins}
          accent="blue"
          loading={loading}
          value={fmtEuro(h?.realisatie)}
          hint={d ? `t/m ${tmLabel} · vorig jaar ${fmtEuroKort(d.vorig.realisatie)}` : undefined}
          definitie={DEFINITIES.realisatieTm}
          trend={d ? { pct: d.groei.realisatie, goodWhenUp: true, label: "t.o.v. vorig jaar, zelfde periode" } : undefined}
        />
        <KpiCard
          label="Actieve cliënten"
          icon={Users}
          accent="green"
          loading={loading}
          value={fmtGetal(h?.actieveClienten)}
          hint={d ? `vorig jaar ${fmtGetal(d.vorig.actieveClienten)}` : undefined}
          definitie={DEFINITIES.actieveClienten}
          trend={d ? { pct: d.groei.actieveClienten, goodWhenUp: true } : undefined}
        />
        <KpiCard
          label="Kosten per cliënt"
          icon={Wallet}
          accent="blue"
          loading={loading}
          value={fmtEuro(h?.kostenPerClient)}
          hint={d ? `vorig jaar ${fmtEuro(d.vorig.kostenPerClient)}` : undefined}
          definitie={DEFINITIES.kostenPerClient}
          trend={d ? { pct: d.groei.kostenPerClient, goodWhenUp: false } : undefined}
        />
        <KpiCard
          label="Budgetverbruik"
          icon={Target}
          accent="yellow"
          loading={loading}
          value={h?.verbruikPct != null ? fmtProcent(h.verbruikPct, 1) : "n.t.b."}
          hint={
            h?.plafond != null
              ? `van ${fmtEuroKort(h.plafond)} ${f.budgetBasis === "basis" ? "basisbudget" : "incl. speling"} · prognose ${fmtEuroKort(h.prognose)} (${fmtProcent(h.prognosePct ?? 0, 0)})`
              : f.budgetBasis === "basis"
                ? "basisbudget nog niet ingevuld (Beheer → Budgetplafonds)"
                : "geen budget voor deze selectie"
          }
          definitie={DEFINITIES.budgetverbruik}
        />
      </div>

      {/* Realisatie cumulatief vs budget */}
      <Card className="animate-in">
        <CardHeader
          title="Prestatieafspraak — realisatie cumulatief vs. budget"
          subtitle={d ? `Gedeclareerd per maand (cumulatief), lineaire prognose vanaf ${tmLabel}, en vorig jaar ter vergelijking` : undefined}
          action={<InfoTip align="right" text={DEFINITIES.monitorPrognose} />}
        />
        <div className="px-3 pb-4 pt-2">
          {loading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : error ? (
            <ErrorState message={error} />
          ) : d && d.maanden.some((m) => (m.cumulatief ?? 0) > 0) ? (
            <CumulatiefChart data={d.maanden} plafond={d.huidig.plafond} jaar={d.jaar} vorigJaar={d.vorigJaar} />
          ) : (
            <EmptyState title="Geen declaraties in deze selectie" />
          )}
        </div>
      </Card>

      {/* Actieve cliënten per maand */}
      <Card className="animate-in">
        <CardHeader
          title="Actieve cliënten per maand"
          subtitle="Toegewezen (lopend traject) versus gedeclareerd, dit jaar en vorig jaar"
          action={<InfoTip align="right" text={DEFINITIES.toegewezenClienten} />}
        />
        <div className="px-3 pb-4 pt-2">
          {loading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : d && d.maanden.some((m) => (m.gedeclareerd ?? 0) > 0 || (m.toegewezen ?? 0) > 0) ? (
            <ClientenMaandChart data={d.maanden} jaar={d.jaar} vorigJaar={d.vorigJaar} />
          ) : (
            <EmptyState />
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        {/* Per gemeente */}
        <Card className="animate-in xl:col-span-3">
          <CardHeader title="Overzicht op gemeenteniveau" subtitle={d ? `${d.jaar} t/m ${tmLabel}` : undefined} />
          <div className="mt-3 overflow-x-auto">
            {loading ? (
              <div className="space-y-2 p-5">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
            ) : d && d.perGemeente.length ? (
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
                    <th className="px-4 py-2">Gemeente</th>
                    <th className="px-4 py-2 text-right">Actieve cliënten</th>
                    <th className="px-4 py-2 text-right">Gedeclareerd</th>
                    <th className="px-4 py-2 text-right">Kosten/cliënt</th>
                    <th className="px-4 py-2 text-right">Budget</th>
                    <th className="px-4 py-2 text-right">Verbruik</th>
                    <th className="px-4 py-2 text-right">Prognose</th>
                  </tr>
                </thead>
                <tbody>
                  {d.perGemeente.map((g) => (
                    <tr key={g.gemeente} className="border-b border-[var(--border)]/60 transition hover:bg-[var(--surface-2)]/60">
                      <td className="px-4 py-2.5 font-semibold">{g.gemeente}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtGetal(g.actieveClienten)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtEuro(g.gedeclareerd)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtEuro(g.kostenPerClient)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--muted)]">{g.plafond != null ? fmtEuro(g.plafond) : "—"}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums"><Verbruik pct={g.verbruikPct} /></td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {fmtEuro(g.prognose)}
                        {g.prognosePct != null && <div className="text-xs text-[var(--muted)]">{fmtProcent(g.prognosePct, 0)} van budget</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-[var(--surface-2)]/60 font-bold">
                    <td className="px-4 py-2.5">Totaal</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtGetal(h?.actieveClienten)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtEuro(h?.realisatie)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtEuro(h?.kostenPerClient)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-[var(--muted)]">{h?.plafond != null ? fmtEuro(h.plafond) : "—"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums"><Verbruik pct={h?.verbruikPct ?? null} /></td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtEuro(h?.prognose)}</td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <EmptyState />
            )}
          </div>
        </Card>

        {/* Jaarvergelijking */}
        <Card className="animate-in xl:col-span-2">
          <CardHeader title="Vergelijking met vorig jaar" subtitle={d ? `Beide t/m ${tmLabel}` : undefined} />
          <div className="mt-3 overflow-x-auto">
            {loading ? (
              <div className="space-y-2 p-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
            ) : d ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
                    <th className="px-4 py-2"></th>
                    <th className="px-4 py-2 text-right">{d.vorigJaar}</th>
                    <th className="px-4 py-2 text-right">{d.jaar}</th>
                    <th className="px-4 py-2 text-right">Groei</th>
                  </tr>
                </thead>
                <tbody>
                  <VergelijkRij label="Actieve cliënten" a={fmtGetal(d.vorig.actieveClienten)} b={fmtGetal(d.huidig.actieveClienten)} pct={d.groei.actieveClienten} />
                  <VergelijkRij label="Gedeclareerd" a={fmtEuro(d.vorig.realisatie)} b={fmtEuro(d.huidig.realisatie)} pct={d.groei.realisatie} />
                  <VergelijkRij label="Kosten per cliënt" a={fmtEuro(d.vorig.kostenPerClient)} b={fmtEuro(d.huidig.kostenPerClient)} pct={d.groei.kostenPerClient} invers />
                  <VergelijkRij label="Prognose jaareinde" a={fmtEuro(d.vorig.prognose)} b={fmtEuro(d.huidig.prognose)} pct={null} />
                </tbody>
              </table>
            ) : (
              <EmptyState />
            )}
          </div>
          <p className="mx-4 mb-4 mt-3 border-t pt-3 text-xs leading-relaxed text-[var(--muted)]">
            <Landmark className="mr-1 inline h-3.5 w-3.5" />
            Verschillen met het gemeentedashboard komen doordat deze cijfers actueler zijn (de gemeente
            loopt ± 1–2 maanden achter op de facturatie) en de gemeente tegen het basisbudget
            (excl. speling) rekent.
          </p>
        </Card>
      </div>
    </div>
  );
}

function Verbruik({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-[var(--muted)]">—</span>;
  const tone = pct > 100 ? "text-[var(--bad)]" : pct > 90 ? "text-[var(--warn)]" : "text-[var(--ok)]";
  return <span className={cn("font-bold", tone)}>{fmtProcent(pct, 1)}</span>;
}

function VergelijkRij({
  label,
  a,
  b,
  pct,
  invers,
}: {
  label: string;
  a: string;
  b: string;
  pct: number | null;
  invers?: boolean;
}) {
  const goed = pct == null ? null : invers ? pct <= 0 : pct >= 0;
  return (
    <tr className="border-b border-[var(--border)]/60">
      <td className="px-4 py-2.5 font-semibold">{label}</td>
      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--muted)]">{a}</td>
      <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{b}</td>
      <td className={cn("px-4 py-2.5 text-right tabular-nums font-bold", goed == null ? "text-[var(--muted)]" : goed ? "text-[var(--ok)]" : "text-[var(--bad)]")}>
        {pct == null ? "—" : `${pct > 0 ? "+" : ""}${fmtProcent(pct, 1)}`}
      </td>
    </tr>
  );
}

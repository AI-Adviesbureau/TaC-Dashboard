"use client";

import { Wallet, TrendingUp, Coins, Users, Info } from "lucide-react";
import { useApi } from "@/lib/use-api";
import { KpiCard } from "@/components/ui/kpi-card";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton, EmptyState } from "@/components/ui/states";
import { BarList } from "@/components/charts/bar-list";
import { fmtEuro, fmtEuroKort, fmtGetal, fmtProcent } from "@/lib/format";
import { DEFINITIES } from "@/lib/definitions";
import type { OverzichtData } from "@/lib/kpi";
import { cn } from "@/lib/cn";

interface KostenData {
  perGemeente: {
    gemeente: string;
    regio: string;
    aantal: number;
    clienten: number;
    inkoop: number;
    omzet: number;
    gerealiseerd: number;
    overhead: number;
    marge: number;
    openstaand: number;
    kostenPerClient: number | null;
  }[];
  plekken: { maand: string; bezet: number }[];
  plafonds: {
    jaar: number;
    regio: string | null;
    gemeente: string | null;
    plafond_bedrag: number | null;
    plekken: number | null;
  }[];
}

export default function KostenPage() {
  const ov = useApi<OverzichtData>("/api/overview");
  const kd = useApi<KostenData>("/api/kosten");
  const k = ov.data;

  const maxPlek = Math.max(1, ...(kd.data?.plekken.map((p) => p.bezet) ?? [1]));
  const heeftPlafonds = (kd.data?.plafonds.length ?? 0) > 0;

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      {/* KPI's */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard
          label="Beschikt budget"
          icon={TrendingUp}
          accent="green"
          loading={ov.loading}
          value={fmtEuroKort(k?.kern.omzet)}
          definitie="Het toegekende budget (beschikking) per traject, één keer geteld — ook als een traject meerdere jaren loopt."
          hint={k ? `${fmtGetal(k.kern.aantal)} trajecten` : undefined}
        />
        <KpiCard
          label="Gerealiseerd"
          icon={TrendingUp}
          accent="blue"
          loading={ov.loading}
          value={fmtEuroKort(k?.kern.gerealiseerd)}
          definitie="De werkelijk gefactureerde bedragen (som van de maandrealisatie over alle jaren)."
          hint="werkelijke facturatie"
        />
        <KpiCard
          label="Inkoopkosten"
          icon={Coins}
          accent="blue"
          loading={ov.loading}
          value={fmtEuroKort(k?.kern.inkoop)}
          hint="behandelaar + regie"
        />
        <KpiCard
          label="Marge"
          icon={Wallet}
          accent="green"
          loading={ov.loading}
          value={fmtEuroKort(k?.kern.marge)}
          definitie={DEFINITIES.marge}
          hint="na inkoop & overhead"
        />
        <KpiCard
          label="Kosten / cliënt"
          icon={Users}
          accent="yellow"
          loading={ov.loading}
          value={fmtEuro(k?.kern.kostenPerClient)}
          definitie={DEFINITIES.kostenPerClient}
          hint={k ? `${fmtGetal(k.kern.clienten)} cliënten` : undefined}
        />
      </div>

      {/* Budgetrealisatie */}
      <Card className="animate-in">
        <CardHeader
          title="Budgetrealisatie per gemeente"
          subtitle="Gerealiseerde omzet versus afgesproken plafond"
        />
        <div className="px-5 pb-5 pt-3">
          {!heeftPlafonds ? (
            <div className="flex items-start gap-3 rounded-2xl border border-[var(--brand-yellow)]/30 bg-[var(--brand-yellow-50)] p-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-[var(--warn)]" />
              <div className="text-sm">
                <p className="font-bold">Budgetplafonds nog niet aangeleverd</p>
                <p className="mt-1 text-[var(--muted)]">
                  Zodra de afgesproken budgetplafonds (en/of plekkenafspraken) per
                  gemeente/regio zijn ingeladen in <code>budget_plafond</code>, toont
                  dit overzicht de realisatie versus het plafond met signaalkleuren.
                  Hieronder de gerealiseerde omzet per gemeente.
                </p>
              </div>
            </div>
          ) : null}

          {kd.loading ? (
            <Skeleton className="mt-4 h-64 w-full" />
          ) : kd.data && kd.data.perGemeente.length ? (
            <div className="mt-4 space-y-3">
              {kd.data.perGemeente.map((g) => {
                const plafond = kd.data!.plafonds.find(
                  (p) => p.gemeente === g.gemeente
                )?.plafond_bedrag;
                return (
                  <BudgetRij
                    key={g.gemeente}
                    naam={g.gemeente}
                    realisatie={g.gerealiseerd}
                    plafond={plafond ?? null}
                    sub={`${fmtGetal(g.aantal)} trajecten · beschikt ${fmtEuro(g.omzet)}`}
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Kosten per cliënt per gemeente */}
        <Card className="animate-in">
          <CardHeader title="Kosten per cliënt" subtitle="Gemiddelde inkoopkosten per cliënt, per gemeente" />
          <div className="px-5 pb-5 pt-3">
            {kd.loading ? (
              <Skeleton className="h-64 w-full" />
            ) : kd.data && kd.data.perGemeente.some((g) => g.kostenPerClient) ? (
              <BarList
                accent="blue"
                items={kd.data.perGemeente
                  .filter((g) => g.kostenPerClient)
                  .sort((a, b) => (b.kostenPerClient ?? 0) - (a.kostenPerClient ?? 0))
                  .slice(0, 12)
                  .map((g) => ({
                    label: g.gemeente,
                    value: Math.round(g.kostenPerClient ?? 0),
                  }))}
                format={(v) => fmtEuro(v)}
              />
            ) : (
              <EmptyState />
            )}
          </div>
        </Card>

        {/* Plekkenbezetting */}
        <Card className="animate-in">
          <CardHeader
            title="Plekkenbezetting per maand"
            subtitle="Aantal bezette plekken (tabblad Plekken)"
          />
          <div className="px-5 pb-5 pt-3">
            {kd.loading ? (
              <Skeleton className="h-64 w-full" />
            ) : kd.data && kd.data.plekken.some((p) => p.bezet) ? (
              <div className="grid grid-cols-12 items-end gap-1.5 pt-8">
                {kd.data.plekken.map((p) => (
                  <div key={p.maand} className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold tabular-nums text-[var(--muted)]">
                      {p.bezet}
                    </span>
                    <div className="flex h-32 w-full items-end">
                      <div
                        className="w-full rounded-md bg-[var(--brand-green)] transition-all duration-700"
                        style={{ height: `${(p.bezet / maxPlek) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[var(--muted)]">{p.maand}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function BudgetRij({
  naam,
  realisatie,
  plafond,
  sub,
}: {
  naam: string;
  realisatie: number;
  plafond: number | null;
  sub: string;
}) {
  const pct = plafond && plafond > 0 ? (realisatie / plafond) * 100 : null;
  const tone =
    pct === null
      ? "var(--brand-green)"
      : pct > 100
        ? "var(--bad)"
        : pct > 90
          ? "var(--warn)"
          : "var(--ok)";
  const width = pct === null ? 100 : Math.min(100, pct);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="font-semibold">{naam}</span>
        <span className="tabular-nums text-sm">
          {fmtEuro(realisatie)}
          {plafond != null && (
            <span className="text-[var(--muted)]"> / {fmtEuro(plafond)}</span>
          )}
          {pct != null && (
            <span className="ml-2 font-bold" style={{ color: tone }}>
              {fmtProcent(Math.round(pct))}
            </span>
          )}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          className={cn("h-full rounded-full transition-all duration-700")}
          style={{ width: `${width}%`, background: tone }}
        />
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">{sub}</p>
    </div>
  );
}

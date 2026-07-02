"use client";

import { useRouter } from "next/navigation";
import { Clock, Wallet, HeartHandshake, Target, Activity, FileDown } from "lucide-react";
import { useApi } from "@/lib/use-api";
import { filtersToQuery } from "@/lib/types";
import { useFilters } from "@/components/filters/filter-context";
import { useOverviewFilters } from "@/components/filters/overview-filter-context";
import { KpiCard } from "@/components/ui/kpi-card";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { TrendChart } from "@/components/charts/trend-chart";
import { BarList } from "@/components/charts/bar-list";
import { Histogram } from "@/components/charts/histogram";
import { DEFINITIES } from "@/lib/definitions";
import {
  fmtMaanden,
  fmtEuro,
  fmtProcent,
  fmtGetal,
  fmtEuroKort,
} from "@/lib/format";
import type { OverzichtData } from "@/lib/kpi";

type TrendPunt = { label: string; instroom: number; uitstroom: number; omzet: number };
type Breakdown = {
  gemeente: { gemeente: string; aantal: number; omzet: number; gem_dlt: number | null }[];
  code: { code: string; aantal: number; omzet: number }[];
  doorlooptijd: { bucket: string; aantal: number }[];
};

export default function OverzichtPage() {
  const router = useRouter();
  const f = useFilters();
  const { gemeenten } = useOverviewFilters();
  const { jaar, regio, van, tot } = f;
  const extra = gemeenten.length ? { gemeente: gemeenten } : undefined;
  const ov = useApi<OverzichtData>("/api/overview", extra);
  const tr = useApi<TrendPunt[]>("/api/trend", extra);
  const bd = useApi<Breakdown>("/api/breakdown", extra);

  const k = ov.data;
  const kort = (iso: string) =>
    new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
  const periodeLabel =
    van || tot
      ? `${van ? kort(van) : "…"} – ${tot ? kort(tot) : "…"}`
      : jaar
        ? `${jaar}`
        : "alle perioden";

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div className="flex items-center justify-between gap-3 animate-in">
        <p className="text-sm text-[var(--muted)]">
          {regio}
          {gemeenten.length > 0 && (
            <>
              {" · "}
              {gemeenten.length === 1 ? gemeenten[0] : `${gemeenten.length} gemeenten`}
            </>
          )}
          {" · "}
          {periodeLabel}
          {!jaar && !van && !tot && (
            <span className="ml-2 rounded-full bg-[var(--brand-yellow-50)] px-2 py-0.5 text-xs font-semibold text-[var(--warn)]">
              kies een jaar voor periodevergelijking
            </span>
          )}
        </p>
        <button
          onClick={() =>
            window.open(
              `/rapportage${filtersToQuery(f, extra)}`,
              "_blank"
            )
          }
          className="flex shrink-0 items-center gap-2 rounded-xl border bg-[var(--surface)] px-3 py-2 text-sm font-semibold shadow-sm transition hover:border-[var(--brand-green)]"
          title="Open een print-klare rapportage (opslaan als PDF)"
        >
          <FileDown className="h-4 w-4" /> Exporteer rapportage
        </button>
      </div>

      {/* KPI-tegels */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard
          label="Doorlooptijd"
          icon={Clock}
          accent="green"
          loading={ov.loading}
          value={fmtMaanden(k?.kern.gem_dlt)}
          hint={k?.kern.med_dlt != null ? `mediaan ${fmtMaanden(k.kern.med_dlt)}` : undefined}
          definitie={DEFINITIES.doorlooptijd}
          trend={k?.trend ? { pct: k.trend.doorlooptijd, goodWhenUp: false } : undefined}
        />
        <KpiCard
          label="Kosten / cliënt"
          icon={Wallet}
          accent="blue"
          loading={ov.loading}
          value={fmtEuro(k?.kern.kostenPerClient)}
          hint={k ? `${fmtGetal(k.kern.clienten)} cliënten` : undefined}
          definitie={DEFINITIES.kostenPerClient}
          trend={k?.trend ? { pct: k.trend.kostenPerClient, goodWhenUp: false } : undefined}
        />
        <KpiCard
          label="Duurzame uitstroom"
          icon={HeartHandshake}
          accent="green"
          loading={ov.loading}
          value={k?.uitstroom.pct != null ? fmtProcent(k.uitstroom.pct, 1) : "—"}
          hint={k ? `${fmtGetal(k.uitstroom.duurzaam)} / ${fmtGetal(k.uitstroom.totaal)} afgerond` : undefined}
          definitie={DEFINITIES.duurzameUitstroom}
        />
        <KpiCard
          label="Budgetrealisatie"
          icon={Target}
          accent="yellow"
          loading={ov.loading}
          value={k?.budget.pct != null ? fmtProcent(k.budget.pct, 0) : "n.t.b."}
          hint={
            k?.budget.plafond != null
              ? `van ${fmtEuroKort(k.budget.plafond)}`
              : "plafonds nog aanleveren"
          }
          definitie={DEFINITIES.budgetrealisatie}
        />
        <KpiCard
          label="Trajecten"
          icon={Activity}
          accent="blue"
          loading={ov.loading}
          value={fmtGetal(k?.kern.aantal)}
          hint={k ? `${fmtGetal(k.kern.lopend)} lopend` : undefined}
          definitie={DEFINITIES.trajecten}
          trend={k?.trend ? { pct: k.trend.aantal, goodWhenUp: true } : undefined}
        />
      </div>

      {/* Trend */}
      <Card className="animate-in">
        <CardHeader
          title={jaar ? `In- en uitstroom per maand (${jaar})` : "In- en uitstroom per jaar"}
          subtitle="Aantal gestarte en afgesloten trajecten"
        />
        <div className="px-3 pb-4 pt-2">
          {tr.loading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : tr.error ? (
            <ErrorState message={tr.error} />
          ) : tr.data && tr.data.some((d) => d.instroom || d.uitstroom) ? (
            <TrendChart data={tr.data} />
          ) : (
            <EmptyState title="Geen trajecten in deze selectie" />
          )}
        </div>
      </Card>

      {/* Verdelingen */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="animate-in">
          <CardHeader title="Trajecten per gemeente" subtitle="Top 12 op aantal" />
          <div className="px-5 pb-5 pt-3">
            {bd.loading ? (
              <Skeleton className="h-64 w-full" />
            ) : bd.data && bd.data.gemeente.length ? (
              <BarList
                accent="green"
                onItemClick={(g) => router.push(`/trajecten?gemeente=${encodeURIComponent(g)}`)}
                items={bd.data.gemeente.slice(0, 12).map((g) => ({
                  label: g.gemeente,
                  value: g.aantal,
                  sub: g.gem_dlt != null ? `· ${fmtMaanden(g.gem_dlt)}` : undefined,
                }))}
                format={(v) => fmtGetal(v)}
              />
            ) : (
              <EmptyState />
            )}
          </div>
        </Card>

        <Card className="animate-in">
          <CardHeader title="Trajecten per productcode" subtitle="Top 10 op aantal" />
          <div className="px-5 pb-5 pt-3">
            {bd.loading ? (
              <Skeleton className="h-64 w-full" />
            ) : bd.data && bd.data.code.length ? (
              <BarList
                accent="blue"
                onItemClick={(c) => router.push(`/trajecten?code=${encodeURIComponent(c)}`)}
                items={bd.data.code.map((c) => ({
                  label: c.code,
                  value: c.aantal,
                  sub: `· ${fmtEuroKort(c.omzet)}`,
                }))}
                format={(v) => fmtGetal(v)}
              />
            ) : (
              <EmptyState />
            )}
          </div>
        </Card>
      </div>

      {/* Histogram doorlooptijd */}
      <Card className="animate-in">
        <CardHeader
          title="Verdeling doorlooptijd"
          subtitle="Aantal afgesloten trajecten per looptijd (maanden)"
        />
        <div className="px-3 pb-4 pt-2">
          {bd.loading ? (
            <Skeleton className="h-[240px] w-full" />
          ) : bd.data && bd.data.doorlooptijd.some((d) => d.aantal) ? (
            <Histogram data={bd.data.doorlooptijd} />
          ) : (
            <EmptyState />
          )}
        </div>
      </Card>
    </div>
  );
}

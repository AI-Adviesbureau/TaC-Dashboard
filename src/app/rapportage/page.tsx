"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Printer, Clock, Wallet, HeartHandshake, Target, Activity } from "lucide-react";
import { Logo } from "@/components/Logo";
import { KpiCard } from "@/components/ui/kpi-card";
import { Card, CardHeader } from "@/components/ui/card";
import { TrendChart } from "@/components/charts/trend-chart";
import { BarList } from "@/components/charts/bar-list";
import { Histogram } from "@/components/charts/histogram";
import {
  fmtMaanden,
  fmtEuro,
  fmtEuroKort,
  fmtProcent,
  fmtGetal,
} from "@/lib/format";
import type { OverzichtData } from "@/lib/kpi";

type TrendPunt = { label: string; instroom: number; uitstroom: number; omzet: number };
type Breakdown = {
  gemeente: { gemeente: string; aantal: number; omzet: number; gem_dlt: number | null }[];
  code: { code: string; aantal: number; omzet: number }[];
  doorlooptijd: { bucket: string; aantal: number }[];
};

export default function RapportagePage() {
  return (
    <Suspense fallback={null}>
      <Rapportage />
    </Suspense>
  );
}

function Rapportage() {
  const params = useSearchParams();
  const qs = params.toString();
  const query = qs ? `?${qs}` : "";

  const [ov, setOv] = useState<OverzichtData | null>(null);
  const [tr, setTr] = useState<TrendPunt[] | null>(null);
  const [bd, setBd] = useState<Breakdown | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`/api/overview${query}`).then((r) => r.json()),
      fetch(`/api/trend${query}`).then((r) => r.json()),
      fetch(`/api/breakdown${query}`).then((r) => r.json()),
    ]).then(([o, t, b]) => {
      if (!active) return;
      setOv(o);
      setTr(t);
      setBd(b);
    });
    return () => {
      active = false;
    };
  }, [query]);

  const regio = params.get("regio") || "Totaal";
  const jaar = params.get("jaar");
  const van = params.get("van");
  const tot = params.get("tot");
  const maand = params.get("maand");
  const MAAND = [
    "januari", "februari", "maart", "april", "mei", "juni",
    "juli", "augustus", "september", "oktober", "november", "december",
  ];
  const kort = (iso: string) =>
    new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
  const periode =
    van || tot
      ? `${van ? kort(van) : "…"} t/m ${tot ? kort(tot) : "…"}`
      : jaar
        ? maand
          ? `${MAAND[parseInt(maand, 10) - 1]} ${jaar}`
          : jaar
        : "alle perioden";

  const gereed = ov && tr && bd;
  const k = ov;
  const vandaag = new Date().toLocaleDateString("nl-NL", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <main className="min-h-screen bg-[var(--bg)] print:bg-white">
      {/* Actiebalk (niet meegeprint) */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b bg-[var(--surface)] px-6 py-3">
        <p className="text-sm font-semibold text-[var(--muted)]">
          Rapportage-voorbeeld — gebruik de knop om op te slaan als PDF.
        </p>
        <button
          onClick={() => window.print()}
          disabled={!gereed}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-105 disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, var(--brand-green), var(--brand-green-700))" }}
        >
          <Printer className="h-4 w-4" /> Opslaan als PDF
        </button>
      </div>

      <div className="mx-auto max-w-[900px] space-y-5 p-6">
        {/* Kop */}
        <div className="flex items-end justify-between border-b pb-4">
          <div>
            <Logo height={40} />
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight">Managementrapportage</h1>
            <p className="text-sm text-[var(--muted)]">
              Regio: <span className="font-semibold text-[var(--text)]">{regio}</span> · Periode:{" "}
              <span className="font-semibold text-[var(--text)]">{periode}</span>
            </p>
          </div>
          <p className="text-right text-xs text-[var(--muted)]">
            Gegenereerd op<br />
            {vandaag}
          </p>
        </div>

        {!gereed ? (
          <p className="py-12 text-center text-sm text-[var(--muted)]">Rapportage laden…</p>
        ) : (
          <>
            {/* KPI's */}
            <div className="grid grid-cols-3 gap-3 print-break">
              <KpiCard
                label="Doorlooptijd" icon={Clock} accent="green"
                value={fmtMaanden(k!.kern.gem_dlt)}
                hint={k!.kern.med_dlt != null ? `mediaan ${fmtMaanden(k!.kern.med_dlt)}` : undefined}
              />
              <KpiCard
                label="Kosten / cliënt" icon={Wallet} accent="blue"
                value={fmtEuro(k!.kern.kostenPerClient)}
                hint={`${fmtGetal(k!.kern.clienten)} cliënten`}
              />
              <KpiCard
                label="Duurzame uitstroom" icon={HeartHandshake} accent="green"
                value={k!.uitstroom.pct != null ? fmtProcent(k!.uitstroom.pct, 1) : "—"}
                hint={`${fmtGetal(k!.uitstroom.duurzaam)} / ${fmtGetal(k!.uitstroom.totaal)}`}
              />
              <KpiCard
                label="Budgetrealisatie" icon={Target} accent="yellow"
                value={k!.budget.pct != null ? fmtProcent(k!.budget.pct, 0) : "n.t.b."}
                hint={k!.budget.plafond != null ? `van ${fmtEuroKort(k!.budget.plafond)}` : "plafonds n.t.b."}
              />
              <KpiCard
                label="Trajecten" icon={Activity} accent="blue"
                value={fmtGetal(k!.kern.aantal)}
                hint={`${fmtGetal(k!.kern.lopend)} lopend`}
              />
              <KpiCard
                label="Beschikt / gerealiseerd" icon={Wallet} accent="green"
                value={fmtEuroKort(k!.kern.omzet)}
                hint={`gereal. ${fmtEuroKort(k!.kern.gerealiseerd)}`}
              />
            </div>

            {/* Trend */}
            <Card className="print-break">
              <CardHeader
                title={jaar ? `In- en uitstroom per maand (${jaar})` : "In- en uitstroom per jaar"}
                subtitle="Aantal gestarte en afgesloten trajecten"
              />
              <div className="px-3 pb-4 pt-2">
                {tr!.some((d) => d.instroom || d.uitstroom) ? (
                  <TrendChart data={tr!} />
                ) : (
                  <p className="py-8 text-center text-sm text-[var(--muted)]">Geen trajecten in deze selectie</p>
                )}
              </div>
            </Card>

            {/* Verdelingen */}
            <div className="grid grid-cols-2 gap-4 print-break">
              <Card>
                <CardHeader title="Per gemeente" subtitle="Top 10 op aantal" />
                <div className="px-5 pb-5 pt-3">
                  <BarList
                    accent="green"
                    items={bd!.gemeente.slice(0, 10).map((g) => ({ label: g.gemeente, value: g.aantal }))}
                    format={(v) => fmtGetal(v)}
                  />
                </div>
              </Card>
              <Card>
                <CardHeader title="Per productcode" subtitle="Top 10 op aantal" />
                <div className="px-5 pb-5 pt-3">
                  <BarList
                    accent="blue"
                    items={bd!.code.slice(0, 10).map((c) => ({ label: c.code, value: c.aantal }))}
                    format={(v) => fmtGetal(v)}
                  />
                </div>
              </Card>
            </div>

            {/* Histogram */}
            <Card className="print-break">
              <CardHeader title="Verdeling doorlooptijd" subtitle="Aantal afgesloten trajecten per looptijd (maanden)" />
              <div className="px-3 pb-4 pt-2">
                <Histogram data={bd!.doorlooptijd} />
              </div>
            </Card>

            <p className="pt-2 text-center text-xs text-[var(--muted)]">
              Pseudonieme gegevens — geen naam of BSN · Talenti a Casa managementdashboard
            </p>
          </>
        )}
      </div>
    </main>
  );
}

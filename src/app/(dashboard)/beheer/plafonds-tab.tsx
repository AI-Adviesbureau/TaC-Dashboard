"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Target } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Skeleton, EmptyState } from "@/components/ui/states";
import { fmtEuro } from "@/lib/format";

interface Plafond {
  id: number;
  jaar: number;
  regio: string | null;
  gemeente: string | null;
  plafond_bedrag: number | null;
  plekken: number | null;
}

const JAREN = ["2026", "2025", "2024", "2023", "2022", "2021", "2020", "2019"];

export function PlafondsTab() {
  const [rows, setRows] = useState<Plafond[] | null>(null);
  const [jaar, setJaar] = useState("2026");
  const [regio, setRegio] = useState("");
  const [gemeente, setGemeente] = useState("");
  const [bedrag, setBedrag] = useState("");
  const [plekken, setPlekken] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/beheer/plafonds");
    setRows(await r.json());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function add() {
    setError(null);
    setSaving(true);
    const res = await fetch("/api/beheer/plafonds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jaar, regio, gemeente, plafond_bedrag: bedrag, plekken }),
    });
    setSaving(false);
    if (!res.ok) {
      setError((await res.json()).error || "Opslaan mislukt.");
      return;
    }
    setGemeente("");
    setBedrag("");
    setPlekken("");
    load();
  }

  async function del(id: number) {
    await fetch(`/api/beheer/plafonds?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <CardHeader
          title="Nieuw budgetplafond"
          subtitle="Vul per jaar en (optioneel) regio of gemeente het afgesproken plafond in. Dit activeert de budgetrealisatie-KPI met signaalkleuren."
          className="px-0 pt-0"
        />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-6">
          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--muted)]">Jaar</label>
            <Select value={jaar} onChange={setJaar} options={JAREN.map((j) => ({ value: j, label: j }))} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--muted)]">Regio</label>
            <Select
              value={regio}
              onChange={setRegio}
              placeholder="Alle / n.v.t."
              options={[
                { value: "Noord-Limburg", label: "Noord-Limburg" },
                { value: "Midden-Limburg", label: "Midden-Limburg" },
              ]}
            />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-bold text-[var(--muted)]">Gemeente (optioneel)</label>
            <input
              value={gemeente}
              onChange={(e) => setGemeente(e.target.value)}
              placeholder="bijv. Venlo"
              className="w-full rounded-xl border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)] focus:ring-4 focus:ring-[var(--brand-green-50)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--muted)]">Plafond €</label>
            <input
              value={bedrag}
              onChange={(e) => setBedrag(e.target.value)}
              inputMode="numeric"
              placeholder="3000000"
              className="w-full rounded-xl border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)] focus:ring-4 focus:ring-[var(--brand-green-50)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--muted)]">Plekken</label>
            <input
              value={plekken}
              onChange={(e) => setPlekken(e.target.value)}
              inputMode="numeric"
              placeholder="optioneel"
              className="w-full rounded-xl border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)] focus:ring-4 focus:ring-[var(--brand-green-50)]"
            />
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-[var(--bad)]">{error}</p>}
        <button
          onClick={add}
          disabled={saving}
          className="mt-4 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-105 disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, var(--brand-green), var(--brand-green-700))" }}
        >
          <Plus className="h-4 w-4" /> Toevoegen
        </button>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="Ingevoerde plafonds" />
        <div className="mt-3 overflow-x-auto">
          {rows === null ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              title="Nog geen plafonds"
              hint="Voeg hierboven het eerste budgetplafond toe."
              icon={<Target className="h-6 w-6" />}
            />
          ) : (
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-5 py-2.5 font-bold">Jaar</th>
                  <th className="px-5 py-2.5 font-bold">Regio</th>
                  <th className="px-5 py-2.5 font-bold">Gemeente</th>
                  <th className="px-5 py-2.5 text-right font-bold">Plafond</th>
                  <th className="px-5 py-2.5 text-right font-bold">Plekken</th>
                  <th className="px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--border)]/60">
                    <td className="px-5 py-2.5 font-semibold">{p.jaar}</td>
                    <td className="px-5 py-2.5">{p.regio ?? "—"}</td>
                    <td className="px-5 py-2.5">{p.gemeente ?? "alle"}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {p.plafond_bedrag != null ? fmtEuro(p.plafond_bedrag) : "—"}
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{p.plekken ?? "—"}</td>
                    <td className="px-5 py-2.5 text-right">
                      <button
                        onClick={() => del(p.id)}
                        className="text-[var(--muted)] transition hover:text-[var(--bad)]"
                        title="Verwijderen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
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

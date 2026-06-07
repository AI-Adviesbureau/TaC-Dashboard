"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/states";
import { SaveInput } from "./save-input";
import { fmtGetal, fmtMaanden } from "@/lib/format";

interface CodeRow {
  code: string;
  aantal: number;
  omschrijving: string | null;
  norm_maanden: number | null;
}

export function CodesTab() {
  const [rows, setRows] = useState<CodeRow[] | null>(null);

  async function load() {
    const r = await fetch("/api/beheer/codes");
    setRows(await r.json());
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function save(code: string, omschrijving: string) {
    await fetch("/api/beheer/codes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, omschrijving }),
    });
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Productcodes"
        subtitle="Geef elke code een leesbare omschrijving. Die verschijnt overal in het dashboard. Norm = standaard doorlooptijd (uit tabblad Venlo)."
      />
      <div className="mt-3 overflow-x-auto">
        {rows === null ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="px-5 py-2.5 font-bold">Code</th>
                <th className="px-5 py-2.5 text-right font-bold">Trajecten</th>
                <th className="px-5 py-2.5 text-right font-bold">Norm</th>
                <th className="px-5 py-2.5 font-bold">Omschrijving</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code} className="border-b border-[var(--border)]/60">
                  <td className="px-5 py-2"><Badge tone="blue">{r.code}</Badge></td>
                  <td className="px-5 py-2 text-right tabular-nums">{fmtGetal(r.aantal)}</td>
                  <td className="px-5 py-2 text-right tabular-nums text-[var(--muted)]">
                    {r.norm_maanden != null ? fmtMaanden(r.norm_maanden) : "—"}
                  </td>
                  <td className="px-5 py-2 w-[45%]">
                    <SaveInput
                      initial={r.omschrijving ?? ""}
                      placeholder="Omschrijving zorgproduct…"
                      onSave={(v) => save(r.code, v)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}

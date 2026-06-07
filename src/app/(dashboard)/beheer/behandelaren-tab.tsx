"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/states";
import { SaveInput } from "./save-input";
import { fmtGetal } from "@/lib/format";

interface BehRow {
  initialen: string;
  aantal: number;
  naam: string | null;
}

export function BehandelarenTab() {
  const [rows, setRows] = useState<BehRow[] | null>(null);

  async function load() {
    const r = await fetch("/api/beheer/behandelaren");
    setRows(await r.json());
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function save(initialen: string, naam: string) {
    await fetch("/api/beheer/behandelaren", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initialen, naam }),
    });
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Behandelaren & regiebehandelaren"
        subtitle="Koppel initialen aan een naam (intern beheerd, los van de cliëntdata). Leeg laten = alleen initialen tonen."
      />
      <div className="mt-3 overflow-x-auto">
        {rows === null ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : (
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="px-5 py-2.5 font-bold">Initialen</th>
                <th className="px-5 py-2.5 text-right font-bold">Trajecten</th>
                <th className="px-5 py-2.5 font-bold">Naam</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.initialen} className="border-b border-[var(--border)]/60">
                  <td className="px-5 py-2"><Badge tone="blue">{r.initialen}</Badge></td>
                  <td className="px-5 py-2 text-right tabular-nums">{fmtGetal(r.aantal)}</td>
                  <td className="px-5 py-2 w-[55%]">
                    <SaveInput
                      initial={r.naam ?? ""}
                      placeholder="Volledige naam…"
                      onSave={(v) => save(r.initialen, v)}
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

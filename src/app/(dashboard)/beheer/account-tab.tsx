"use client";

import { useState } from "react";
import { KeyRound, Check, Loader2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";

export function AccountTab() {
  const [huidig, setHuidig] = useState("");
  const [nieuw, setNieuw] = useState("");
  const [bevestig, setBevestig] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (nieuw !== bevestig) {
      setError("De nieuwe wachtwoorden komen niet overeen.");
      return;
    }
    if (nieuw.length < 8) {
      setError("Nieuw wachtwoord moet minstens 8 tekens zijn.");
      return;
    }
    setState("saving");
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ huidig, nieuw }),
    });
    if (!res.ok) {
      setState("idle");
      setError((await res.json()).error || "Wijzigen mislukt.");
      return;
    }
    setState("done");
    setHuidig("");
    setNieuw("");
    setBevestig("");
    setTimeout(() => setState("idle"), 2500);
  }

  const inputCls =
    "w-full rounded-xl border bg-[var(--surface)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--brand-green)] focus:ring-4 focus:ring-[var(--brand-green-50)]";

  return (
    <Card className="max-w-md p-6">
      <CardHeader title="Wachtwoord wijzigen" subtitle="Kies een sterk, uniek wachtwoord (minimaal 8 tekens)." className="px-0 pt-0" />
      <form onSubmit={submit} className="mt-4 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold">Huidig wachtwoord</label>
          <input type="password" autoComplete="current-password" required value={huidig} onChange={(e) => setHuidig(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold">Nieuw wachtwoord</label>
          <input type="password" autoComplete="new-password" required value={nieuw} onChange={(e) => setNieuw(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold">Bevestig nieuw wachtwoord</label>
          <input type="password" autoComplete="new-password" required value={bevestig} onChange={(e) => setBevestig(e.target.value)} className={inputCls} />
        </div>
        {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
        <button
          type="submit"
          disabled={state === "saving"}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-105 disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, var(--brand-green), var(--brand-green-700))" }}
        >
          {state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : state === "done" ? <Check className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
          {state === "done" ? "Gewijzigd!" : "Wachtwoord wijzigen"}
        </button>
      </form>
    </Card>
  );
}

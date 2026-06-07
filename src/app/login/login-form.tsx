"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/overzicht";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Inloggen mislukt.");
        setLoading(false);
        return;
      }
      router.replace(redirect);
      router.refresh();
    } catch {
      setError("Er ging iets mis. Probeer het opnieuw.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">
          E-mailadres
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border bg-[var(--surface)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--brand-green)] focus:ring-4 focus:ring-[var(--brand-green-50)]"
          placeholder="naam@talentiacasa.nl"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-semibold">
          Wachtwoord
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border bg-[var(--surface)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--brand-green)] focus:ring-4 focus:ring-[var(--brand-green-50)]"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-[var(--bad)]/30 bg-[var(--bad)]/8 px-3.5 py-2.5 text-sm text-[var(--bad)]">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
        style={{
          background: "linear-gradient(135deg, var(--brand-green), var(--brand-green-700))",
        }}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogIn className="h-4 w-4" />
        )}
        {loading ? "Bezig met inloggen…" : "Inloggen"}
      </button>
    </form>
  );
}

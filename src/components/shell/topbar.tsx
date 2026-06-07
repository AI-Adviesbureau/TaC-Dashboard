"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, ChevronDown, LogOut, X } from "lucide-react";
import { useFilters } from "@/components/filters/filter-context";
import { REGIO_OPTIES, MAAND_NAMEN_VOL } from "@/lib/types";
import { MODULES } from "@/lib/config/modules";
import { cn } from "@/lib/cn";

const JAREN = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019];

export function Topbar({ naam }: { naam: string | null }) {
  const pathname = usePathname();
  const huidig = MODULES.find((m) => pathname.startsWith(m.href));

  return (
    <header className="sticky top-0 z-20 border-b bg-[var(--bg)]/85 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-extrabold tracking-tight">
            {huidig?.label ?? "Dashboard"}
          </h1>
          <p className="hidden truncate text-xs text-[var(--muted)] sm:block">
            {huidig?.beschrijving}
          </p>
        </div>

        <RegioSwitch />
        <PeriodPicker />
        <UserMenu naam={naam} />
      </div>
    </header>
  );
}

function RegioSwitch() {
  const f = useFilters();
  return (
    <div className="hidden rounded-xl border bg-[var(--surface)] p-1 shadow-sm lg:flex">
      {REGIO_OPTIES.map((r) => {
        const active = f.regio === r;
        const label = r === "Noord-Limburg" ? "Noord" : r === "Midden-Limburg" ? "Midden" : "Totaal";
        return (
          <button
            key={r}
            onClick={() => f.setRegio(r)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-semibold transition-all",
              active
                ? "bg-[var(--brand-green)] text-white shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function PeriodPicker() {
  const f = useFilters();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const kort = (iso: string) =>
    new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
  const heeftPeriode = !!(f.jaar || f.van || f.tot);
  const label =
    f.van || f.tot
      ? `${f.van ? kort(f.van) : "…"} – ${f.tot ? kort(f.tot) : "…"}`
      : f.jaar
        ? f.maand
          ? `${MAAND_NAMEN_VOL[f.maand - 1]} ${f.jaar}`
          : `${f.jaar}`
        : "Alle perioden";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 rounded-xl border bg-[var(--surface)] px-3 py-2 text-sm font-semibold shadow-sm transition hover:border-[var(--brand-green)]",
          heeftPeriode ? "text-[var(--text)]" : "text-[var(--muted)]"
        )}
      >
        <CalendarDays className="h-4 w-4" />
        <span className="hidden sm:inline">{label}</span>
        <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-2xl border bg-[var(--surface)] p-3 shadow-[var(--shadow-hover)] animate-in">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
              Jaar
            </span>
            {heeftPeriode && (
              <button
                onClick={() => {
                  f.setJaar(null);
                  f.setRange(null, null);
                }}
                className="flex items-center gap-1 text-xs font-semibold text-[var(--brand-green-700)] hover:underline"
              >
                <X className="h-3 w-3" /> wissen
              </button>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {JAREN.map((j) => (
              <button
                key={j}
                onClick={() => f.setJaar(f.jaar === j ? null : j)}
                className={cn(
                  "rounded-lg px-2 py-1.5 text-sm font-semibold transition",
                  f.jaar === j
                    ? "bg-[var(--brand-green)] text-white"
                    : "bg-[var(--surface-2)] hover:bg-[var(--brand-green-50)]"
                )}
              >
                {j}
              </button>
            ))}
          </div>

          {f.jaar && (
            <>
              <div className="mb-2 mt-3 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
                Maand (optioneel)
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {MAAND_NAMEN_VOL.map((m, i) => (
                  <button
                    key={m}
                    onClick={() => f.setMaand(f.maand === i + 1 ? null : i + 1)}
                    className={cn(
                      "rounded-lg px-1 py-1.5 text-xs font-semibold transition",
                      f.maand === i + 1
                        ? "bg-[var(--brand-blue)] text-white"
                        : "bg-[var(--surface-2)] hover:bg-[var(--brand-blue-50)]"
                    )}
                  >
                    {m.slice(0, 3)}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="my-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-[var(--border)]" />
            <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
              of eigen periode
            </span>
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>
          <div className="flex items-end gap-2">
            <label className="flex-1">
              <span className="mb-1 block text-[11px] font-semibold text-[var(--muted)]">Van</span>
              <input
                type="date"
                value={f.van ?? ""}
                max={f.tot ?? undefined}
                onChange={(e) => f.setRange(e.target.value || null, f.tot)}
                className="w-full rounded-lg border bg-[var(--surface)] px-2 py-1.5 text-xs outline-none focus:border-[var(--brand-green)]"
              />
            </label>
            <label className="flex-1">
              <span className="mb-1 block text-[11px] font-semibold text-[var(--muted)]">Tot</span>
              <input
                type="date"
                value={f.tot ?? ""}
                min={f.van ?? undefined}
                onChange={(e) => f.setRange(f.van, e.target.value || null)}
                className="w-full rounded-lg border bg-[var(--surface)] px-2 py-1.5 text-xs outline-none focus:border-[var(--brand-green)]"
              />
            </label>
          </div>
          <p className="mt-2 text-[10px] text-[var(--muted)]">
            Filtert op intakedatum binnen de gekozen periode.
          </p>
        </div>
      )}
    </div>
  );
}

function UserMenu({ naam }: { naam: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initials = (naam || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white shadow-sm transition hover:brightness-105"
        style={{ background: "linear-gradient(135deg, var(--brand-blue), var(--brand-blue-700))" }}
        title={naam ?? "Account"}
      >
        {initials}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl border bg-[var(--surface)] p-2 shadow-[var(--shadow-hover)] animate-in">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-bold">{naam ?? "Gebruiker"}</p>
            <p className="text-xs text-[var(--muted)]">Ingelogd</p>
          </div>
          <div className="my-1 border-t" />
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--bad)] transition hover:bg-[var(--bad)]/8"
          >
            <LogOut className="h-4 w-4" /> Uitloggen
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  FileSpreadsheet,
  Columns3,
  ChevronLeft,
  ChevronRight,
  ListChecks,
} from "lucide-react";
import { useApi } from "@/lib/use-api";
import { useFilters } from "@/components/filters/filter-context";
import { filtersToQuery } from "@/lib/types";
import type { TrajectRow } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Skeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { TrajectDetail } from "./traject-detail";
import { fmtDatum, fmtEuro, fmtMaanden, fmtGetal } from "@/lib/format";
import { cn } from "@/lib/cn";

const PAGE_SIZE = 25;

interface Opties {
  gemeenten: string[];
  codes: string[];
  behandelaren: string[];
}

const KOLOMMEN = [
  { key: "jaar", label: "Jaar" },
  { key: "code", label: "Code" },
  { key: "behandelaar", label: "Behandelaar" },
  { key: "intake", label: "Intake" },
  { key: "eind", label: "Einde" },
  { key: "doorlooptijd", label: "Doorlooptijd" },
  { key: "omzet", label: "Omzet" },
  { key: "status", label: "Status" },
] as const;

type ColKey = (typeof KOLOMMEN)[number]["key"];

function dltTone(d: number | null, lopend: boolean, norm: number | null) {
  if (lopend) return "blue" as const;
  if (d === null) return "neutral" as const;
  const grens = norm ?? 12;
  if (d <= grens) return "ok" as const;
  if (d <= grens * 1.5) return "warn" as const;
  return "bad" as const;
}

export default function TrajectenPage() {
  return (
    <Suspense fallback={null}>
      <TrajectenInner />
    </Suspense>
  );
}

function TrajectenInner() {
  const filters = useFilters();
  const urlParams = useSearchParams();
  const opts = useApi<Opties>("/api/options");

  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [gemeente, setGemeente] = useState(urlParams.get("gemeente") || "");
  const [code, setCode] = useState(urlParams.get("code") || "");
  const [behandelaar, setBehandelaar] = useState("");
  const [lopend, setLopend] = useState("");
  const [betaald, setBetaald] = useState("");
  const [sort, setSort] = useState("intake");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<TrajectRow | null>(null);
  const [hidden, setHidden] = useState<Set<ColKey>>(new Set());
  const [colMenu, setColMenu] = useState(false);
  const colRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(0);
  }, [q, gemeente, code, behandelaar, lopend, betaald, sort, dir, filters.regio, filters.jaar, filters.maand]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (colRef.current && !colRef.current.contains(e.target as Node)) setColMenu(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const extra = useMemo(
    () => ({
      q: q || undefined,
      gemeente: gemeente || undefined,
      code: code || undefined,
      behandelaar: behandelaar || undefined,
      lopend: lopend || undefined,
      betaald: betaald || undefined,
      sort,
      dir,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [q, gemeente, code, behandelaar, lopend, betaald, sort, dir, page]
  );

  const { data, loading, error } = useApi<{ rows: TrajectRow[]; total: number }>("/api/trajecten", extra);

  const total = data?.total ?? 0;
  const pages = Math.ceil(total / PAGE_SIZE);
  const show = (k: ColKey) => !hidden.has(k);

  function toggleSort(col: string) {
    if (sort === col) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSort(col);
      setDir("desc");
    }
  }

  function toggleCol(k: ColKey) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  // Haalt ALLE rijen op die aan de filters voldoen, in pagina's van 500
  // (de server begrenst limit op 500). Voorkomt stilzwijgend afkappen bij export.
  async function fetchAlleRijen(): Promise<TrajectRow[]> {
    const PAGE = 500;
    const all: TrajectRow[] = [];
    for (let offset = 0; offset < 100000; offset += PAGE) {
      const base = filtersToQuery(filters, { ...extra, limit: PAGE, offset });
      const res = await fetch("/api/trajecten" + base);
      const json = (await res.json()) as { rows: TrajectRow[]; total: number };
      all.push(...json.rows);
      if (all.length >= json.total || json.rows.length < PAGE) break;
    }
    return all;
  }

  function exportRijen(rows: TrajectRow[]) {
    return rows.map((r) => ({
      Jaar: r.jaar,
      Cliënt: r.rel_nr ?? "",
      Gemeente: r.gemeente ?? "",
      Regio: r.regio,
      Code: r.code ?? "",
      Zorgproduct: r.code_omschrijving ?? "",
      Behandelaar: r.behandelaar ?? "",
      Regiebehandelaar: r.rb ?? "",
      Intake: r.intake ?? "",
      Einde: r.eind ?? "",
      "Doorlooptijd (mnd)": r.doorlooptijd ?? "",
      "Norm (mnd)": r.norm_maanden ?? "",
      "Beschikt budget": r.omzet,
      "Gerealiseerd": r.gerealiseerd,
      Inkoop: r.inkoop,
      Marge: r.marge,
      Betaald: r.betaald ? "ja" : "nee",
      Openstaand: r.openstaand,
    }));
  }

  async function exportCSV() {
    const rows = exportRijen(await fetchAlleRijen());
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws, { FS: ";" });
    download(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }), "csv");
  }

  async function exportXLSX() {
    const rows = exportRijen(await fetchAlleRijen());
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Trajecten");
    XLSX.writeFile(wb, `trajecten-export-${stamp()}.xlsx`);
  }

  function stamp() {
    return new Date().toISOString().slice(0, 10);
  }
  function download(blob: Blob, ext: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trajecten-export-${stamp()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const heeftFilter = gemeente || code || behandelaar || lopend || betaald || q;

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <Card className="p-4 animate-in">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Zoek op cliëntnummer, gemeente, code of behandelaar…"
              className="w-full rounded-xl border bg-[var(--surface)] py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[var(--brand-green)] focus:ring-4 focus:ring-[var(--brand-green-50)]"
            />
          </div>
          <Select className="w-40" value={gemeente} onChange={setGemeente} placeholder="Alle gemeenten" options={(opts.data?.gemeenten ?? []).map((g) => ({ value: g, label: g }))} />
          <Select className="w-32" value={code} onChange={setCode} placeholder="Alle codes" options={(opts.data?.codes ?? []).map((c) => ({ value: c, label: c }))} />
          <Select className="w-36" value={behandelaar} onChange={setBehandelaar} placeholder="Alle behandelaren" options={(opts.data?.behandelaren ?? []).map((b) => ({ value: b, label: b }))} />
          <Select className="w-36" value={lopend} onChange={setLopend} placeholder="Alle statussen" options={[{ value: "ja", label: "Lopend" }, { value: "nee", label: "Afgesloten" }]} />
          <Select className="w-36" value={betaald} onChange={setBetaald} placeholder="Betaling: alle" options={[{ value: "ja", label: "Betaald" }, { value: "open", label: "Openstaand" }]} />
          {heeftFilter && (
            <button
              onClick={() => { setSearchInput(""); setGemeente(""); setCode(""); setBehandelaar(""); setLopend(""); setBetaald(""); }}
              className="text-sm font-semibold text-[var(--brand-green-700)] hover:underline"
            >
              wissen
            </button>
          )}

          <div className="relative ml-auto flex gap-2" ref={colRef}>
            <button onClick={() => setColMenu((o) => !o)} className="flex items-center gap-2 rounded-xl border bg-[var(--surface)] px-3 py-2 text-sm font-semibold transition hover:border-[var(--brand-green)]">
              <Columns3 className="h-4 w-4" /> Kolommen
            </button>
            {colMenu && (
              <div className="absolute right-0 top-11 z-30 w-48 rounded-2xl border bg-[var(--surface)] p-2 shadow-[var(--shadow-hover)] animate-in">
                {KOLOMMEN.map((c) => (
                  <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--surface-2)]">
                    <input type="checkbox" checked={show(c.key)} onChange={() => toggleCol(c.key)} className="accent-[var(--brand-green)]" />
                    {c.label}
                  </label>
                ))}
              </div>
            )}
            <button onClick={exportCSV} className="flex items-center gap-2 rounded-xl border bg-[var(--surface)] px-3 py-2 text-sm font-semibold transition hover:border-[var(--brand-green)]" title="Exporteer naar CSV">
              <Download className="h-4 w-4" /> CSV
            </button>
            <button onClick={exportXLSX} className="flex items-center gap-2 rounded-xl border bg-[var(--surface)] px-3 py-2 text-sm font-semibold transition hover:border-[var(--brand-green)]" title="Exporteer naar Excel">
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden animate-in">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <p className="text-sm font-semibold">{loading ? "Laden…" : `${fmtGetal(total)} trajecten`}</p>
          <p className="text-xs text-[var(--muted)]">Klik op een rij voor details</p>
        </div>

        {error ? (
          <ErrorState message={error} />
        ) : loading && !data ? (
          <div className="space-y-2 p-5">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : data && data.rows.length === 0 ? (
          <EmptyState title="Geen trajecten gevonden" hint="Pas de filters of zoekterm aan." icon={<ListChecks className="h-6 w-6" />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  {show("jaar") && <Th onClick={() => toggleSort("jaar")} active={sort === "jaar"} dir={dir}>Jaar</Th>}
                  <Th onClick={() => toggleSort("rel_nr")} active={sort === "rel_nr"} dir={dir}>Cliënt</Th>
                  <Th onClick={() => toggleSort("gemeente")} active={sort === "gemeente"} dir={dir}>Gemeente</Th>
                  {show("code") && <Th onClick={() => toggleSort("code")} active={sort === "code"} dir={dir}>Code</Th>}
                  {show("behandelaar") && <th className="px-4 py-2.5 font-bold">Beh.</th>}
                  {show("intake") && <Th onClick={() => toggleSort("intake")} active={sort === "intake"} dir={dir}>Intake</Th>}
                  {show("eind") && <Th onClick={() => toggleSort("eind")} active={sort === "eind"} dir={dir}>Einde</Th>}
                  {show("doorlooptijd") && <Th onClick={() => toggleSort("doorlooptijd")} active={sort === "doorlooptijd"} dir={dir}>Doorlooptijd</Th>}
                  {show("omzet") && <Th onClick={() => toggleSort("omzet")} active={sort === "omzet"} dir={dir} right>Omzet</Th>}
                  {show("status") && <th className="px-4 py-2.5 font-bold">Status</th>}
                </tr>
              </thead>
              <tbody>
                {data?.rows.map((r) => (
                  <tr key={r.id} onClick={() => setDetail(r)} className="cursor-pointer border-b border-[var(--border)]/60 transition hover:bg-[var(--brand-green-50)]/40">
                    {show("jaar") && <td className="px-4 py-2.5 text-[var(--muted)]">{r.jaar}</td>}
                    <td className="px-4 py-2.5 font-semibold tabular-nums">{r.rel_nr ?? "—"}</td>
                    <td className="px-4 py-2.5">{r.gemeente ?? "—"}</td>
                    {show("code") && (
                      <td className="px-4 py-2.5">
                        <span className="tabular-nums">{r.code ?? "—"}</span>
                        {r.code_omschrijving && <span className="block text-xs text-[var(--muted)]">{r.code_omschrijving}</span>}
                      </td>
                    )}
                    {show("behandelaar") && <td className="px-4 py-2.5 text-[var(--muted)]">{r.behandelaar ?? "—"}</td>}
                    {show("intake") && <td className="px-4 py-2.5 whitespace-nowrap">{fmtDatum(r.intake)}</td>}
                    {show("eind") && <td className="px-4 py-2.5 whitespace-nowrap">{r.eind ? fmtDatum(r.eind) : "—"}</td>}
                    {show("doorlooptijd") && (
                      <td className="px-4 py-2.5">
                        <Badge tone={dltTone(r.doorlooptijd, r.lopend, r.norm_maanden)}>
                          {r.lopend ? "lopend" : fmtMaanden(r.doorlooptijd)}
                        </Badge>
                      </td>
                    )}
                    {show("omzet") && <td className="px-4 py-2.5 text-right tabular-nums">{fmtEuro(r.omzet)}</td>}
                    {show("status") && (
                      <td className="px-4 py-2.5">
                        {r.betaald ? <Badge tone="ok">betaald</Badge> : r.openstaand > 0 ? <Badge tone="warn">open</Badge> : <span className="text-xs text-[var(--muted)]">—</span>}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between border-t px-5 py-3">
            <p className="text-xs text-[var(--muted)]">Pagina {page + 1} van {pages}</p>
            <div className="flex gap-2">
              <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-semibold transition hover:border-[var(--brand-green)] disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" /> Vorige
              </button>
              <button disabled={page >= pages - 1} onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-semibold transition hover:border-[var(--brand-green)] disabled:opacity-40">
                Volgende <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {detail && <TrajectDetail row={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function Th({ children, onClick, active, dir, right }: { children: React.ReactNode; onClick: () => void; active: boolean; dir: "asc" | "desc"; right?: boolean }) {
  return (
    <th className={cn("px-4 py-2.5 font-bold", right && "text-right")}>
      <button onClick={onClick} className={cn("inline-flex items-center gap-1 transition hover:text-[var(--text)]", active && "text-[var(--brand-green-700)]")}>
        {children}
        {active ? (dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
      </button>
    </th>
  );
}

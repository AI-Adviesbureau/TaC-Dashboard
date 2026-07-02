"use client";

import { useEffect, useRef, useState } from "react";
import {
  UploadCloud, FileSpreadsheet, Loader2, CheckCircle2, Trash2, Database, AlertTriangle,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { fmtGetal, fmtEuroKort } from "@/lib/format";

interface Status {
  trajecten: number;
  clienten: number;
  laatsteUpload: string | null;
  laatsteBestand: string | null;
}
interface Summary {
  trajecten: number;
  clienten: number;
  metDoorlooptijd: number;
  lopend: number;
  omzet: number;
  inkoop: number;
  perRegio: Record<string, number>;
  perJaar: Record<string, number>;
  normen: number;
  plekken: number;
  issues: Record<string, number>;
}

export function DataTab() {
  const [status, setStatus] = useState<Status | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function loadStatus() {
    const r = await fetch("/api/beheer/upload");
    if (r.ok) setStatus(await r.json());
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStatus();
  }, []);

  function pick(f: File | null) {
    setError(null);
    setSummary(null);
    if (f && !/\.(xlsx|xls)$/i.test(f.name)) {
      setError("Kies een Excel-bestand (.xlsx of .xls).");
      return;
    }
    setFile(f);
  }

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/beheer/upload", { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "Upload mislukt.");
      } else {
        setSummary(data.summary);
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
        loadStatus();
      }
    } catch {
      setError("Er ging iets mis tijdens het uploaden.");
    } finally {
      setBusy(false);
    }
  }

  async function wipe() {
    if (!confirm("Weet je zeker dat je alle trajectdata wilt wissen? Je moet daarna opnieuw uploaden."))
      return;
    setBusy(true);
    setError(null);
    setSummary(null);
    await fetch("/api/beheer/wipe", { method: "POST" });
    setBusy(false);
    loadStatus();
  }

  const heeftData = (status?.trajecten ?? 0) > 0;

  return (
    <div className="space-y-5">
      {/* Status */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="grid h-11 w-11 place-items-center rounded-xl"
              style={{ background: "var(--brand-green-50)", color: "var(--brand-green)" }}
            >
              <Database className="h-5 w-5" />
            </span>
            <div>
              {heeftData ? (
                <>
                  <p className="font-extrabold">
                    {fmtGetal(status!.trajecten)} trajecten · {fmtGetal(status!.clienten)} cliënten geladen
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {status!.laatsteBestand ? `Bestand: ${status!.laatsteBestand} · ` : ""}
                    {status!.laatsteUpload
                      ? `geüpload ${new Date(status!.laatsteUpload).toLocaleString("nl-NL", { dateStyle: "medium", timeStyle: "short" })}`
                      : "bron onbekend"}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-extrabold">Nog geen data geladen</p>
                  <p className="text-xs text-[var(--muted)]">
                    Upload het Excel-totaaloverzicht om het dashboard te vullen.
                  </p>
                </>
              )}
            </div>
          </div>
          {heeftData && (
            <button
              onClick={wipe}
              disabled={busy}
              className="flex items-center gap-2 rounded-xl border border-[var(--bad)]/30 px-3 py-2 text-sm font-semibold text-[var(--bad)] transition hover:bg-[var(--bad)]/8 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" /> Data wissen
            </button>
          )}
        </div>
      </Card>

      {/* Upload */}
      <Card className="p-5">
        <CardHeader
          title="Nieuwe data uploaden"
          subtitle="Sleep het Excel-totaaloverzicht hierheen of kies een bestand. Een nieuwe upload vervangt de huidige data. Naam/BSN worden automatisch genegeerd — alleen het relatienummer wordt bewaard."
          className="px-0 pt-0"
        />

        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            pick(e.dataTransfer.files?.[0] ?? null);
          }}
          className={`mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
            drag ? "border-[var(--brand-green)] bg-[var(--brand-green-50)]" : "border-[var(--border)] hover:border-[var(--brand-green)]"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <>
              <FileSpreadsheet className="h-8 w-8 text-[var(--brand-green)]" />
              <p className="font-semibold">{file.name}</p>
              <p className="text-xs text-[var(--muted)]">{(file.size / 1024 / 1024).toFixed(1)} MB · klik om te wijzigen</p>
            </>
          ) : (
            <>
              <UploadCloud className="h-8 w-8 text-[var(--muted)]" />
              <p className="font-semibold">Sleep hierheen of klik om te kiezen</p>
              <p className="text-xs text-[var(--muted)]">.xlsx of .xls · max 20 MB</p>
            </>
          )}
        </label>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--bad)]/30 bg-[var(--bad)]/8 px-3.5 py-2.5 text-sm text-[var(--bad)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={upload}
          disabled={!file || busy}
          className="mt-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-105 disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, var(--brand-green), var(--brand-green-700))" }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          {busy ? "Verwerken…" : "Upload & verwerk"}
        </button>
      </Card>

      {/* Resultaat */}
      {summary && (
        <Card className="p-5 animate-in">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[var(--ok)]" />
            <h3 className="font-extrabold">Verwerkt en geladen</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Trajecten" value={fmtGetal(summary.trajecten)} />
            <Stat label="Unieke cliënten" value={fmtGetal(summary.clienten)} />
            <Stat label="Omzet/budget" value={fmtEuroKort(summary.omzet)} />
            <Stat label="Inkoopkosten" value={fmtEuroKort(summary.inkoop)} />
          </div>
          <div className="mt-3 text-xs text-[var(--muted)]">
            Per jaar: {Object.entries(summary.perJaar).map(([j, n]) => `${j}: ${n}`).join(" · ")}
          </div>
          {Object.keys(summary.issues).length > 0 && (
            <div className="mt-3 rounded-xl bg-[var(--surface-2)] p-3 text-xs">
              <p className="mb-1 font-bold text-[var(--muted)]">Datakwaliteit-signalen (automatisch afgevangen):</p>
              <ul className="space-y-0.5 text-[var(--muted)]">
                {Object.entries(summary.issues).map(([k, v]) => (
                  <li key={k}>· {k.replace(/_/g, " ")}: {v}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-[var(--surface)] p-3">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-0.5 text-lg font-extrabold tabular-nums">{value}</p>
    </div>
  );
}

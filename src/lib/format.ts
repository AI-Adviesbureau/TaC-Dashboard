/** Nederlandse opmaakhulpjes. */

const eur = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const eur2 = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const num0 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });
const num1 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });

export function fmtEuro(v: number | null | undefined, decimals = false): string {
  if (v === null || v === undefined || isNaN(v)) return "—";
  return decimals ? eur2.format(v) : eur.format(v);
}

export function fmtGetal(v: number | null | undefined): string {
  if (v === null || v === undefined || isNaN(v)) return "—";
  return num0.format(v);
}

export function fmtMaanden(v: number | null | undefined): string {
  if (v === null || v === undefined || isNaN(v)) return "—";
  return `${num1.format(v)} mnd`;
}

export function fmtProcent(v: number | null | undefined, decimals = 0): string {
  if (v === null || v === undefined || isNaN(v)) return "—";
  return `${v.toLocaleString("nl-NL", { maximumFractionDigits: decimals })}%`;
}

export function fmtDatum(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

/** Korte weergave van grote bedragen: € 1,2 mln / € 340 k. */
export function fmtEuroKort(v: number | null | undefined): string {
  if (v === null || v === undefined || isNaN(v)) return "—";
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `€ ${num1.format(v / 1_000_000)} mln`;
  if (abs >= 10_000) return `€ ${num0.format(v / 1000)} k`;
  return eur.format(v);
}

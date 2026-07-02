import type { Filters } from "./kpi";

function parseGemeente(p: URLSearchParams): string | string[] | null {
  const repeated = p.getAll("gemeente").filter(Boolean);
  if (repeated.length > 1) return repeated;
  const raw = p.get("gemeente");
  if (!raw) return null;
  if (raw.includes(",")) {
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return null;
    return parts.length === 1 ? parts[0] : parts;
  }
  return raw;
}

/** Leest de globale + dimensiefilters uit de querystring van een request. */
export function parseFilters(url: URL): Filters {
  const p = url.searchParams;
  const jaar = p.get("jaar");
  const maand = p.get("maand");
  return {
    regio: p.get("regio") || null,
    jaar: jaar ? parseInt(jaar, 10) : null,
    maand: maand ? parseInt(maand, 10) : null,
    van: p.get("van") || null,
    tot: p.get("tot") || null,
    gemeente: parseGemeente(p),
    code: p.get("code") || null,
    behandelaar: p.get("behandelaar") || null,
    rb: p.get("rb") || null,
  };
}

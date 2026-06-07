import type { Filters } from "./kpi";

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
    gemeente: p.get("gemeente") || null,
    code: p.get("code") || null,
    behandelaar: p.get("behandelaar") || null,
    rb: p.get("rb") || null,
  };
}

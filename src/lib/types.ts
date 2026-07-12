/** Gedeelde types tussen client en server. */

export type RegioFilter = "Totaal" | "Noord-Limburg" | "Midden-Limburg";

export const REGIO_OPTIES: RegioFilter[] = [
  "Totaal",
  "Noord-Limburg",
  "Midden-Limburg",
];

/** Globale filters die voor het hele dashboard gelden. */
export interface GlobalFilters {
  regio: RegioFilter;
  jaar: number | null; // null = alle jaren (leeg na refresh)
  maand: number | null; // 1-12, optioneel
  van: string | null; // ISO-datum (custom periode), sluit jaar/maand uit
  tot: string | null; // ISO-datum
}

export const MAAND_NAMEN_VOL = [
  "Januari",
  "Februari",
  "Maart",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Augustus",
  "September",
  "Oktober",
  "November",
  "December",
];

/** Eén (gededupliceerd) traject zoals de API het teruggeeft (client-veilig). */
export interface TrajectRow {
  id: number;
  jaar: number; // Excel-lijst (bron_jaar / tabblad)
  rel_nr: number | null;
  gemeente: string | null;
  regio: string;
  behandelaar: string | null;
  rb: string | null;
  intake: string | null;
  eind: string | null;
  doorlooptijd: number | null;
  lopend: boolean;
  code: string | null;
  code_omschrijving: string | null;
  norm_maanden: number | null;
  omzet: number; // beschikt budget (1x)
  gerealiseerd: number; // som maandfacturatie
  inkoop: number;
  marge: number;
  overhead: number;
  betaald: boolean;
  betaald_bedrag: number;
  openstaand: number;
}

/** Bouwt een query-string voor de API op basis van de globale filters. */
export function filtersToQuery(
  f: GlobalFilters,
  extra?: Record<string, string | number | string[] | undefined | null>
): string {
  const p = new URLSearchParams();
  if (f.regio && f.regio !== "Totaal") p.set("regio", f.regio);
  if (f.jaar) p.set("jaar", String(f.jaar));
  if (f.maand) p.set("maand", String(f.maand));
  if (f.van) p.set("van", f.van);
  if (f.tot) p.set("tot", f.tot);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        if (v.length) p.set(k, v.join(","));
      } else {
        p.set(k, String(v));
      }
    }
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

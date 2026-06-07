/**
 * Normalisatie- en mappingfuncties voor de Talenti a Casa dataset.
 * Gedeeld tussen het ingest-script en de applicatie zodat dezelfde
 * regels overal gelden (regio-indeling, gemeente-opschoning, etc.).
 */

export const REGIO = {
  NOORD: "Noord-Limburg",
  MIDDEN: "Midden-Limburg",
  OVERIG: "Overig",
} as const;

export type Regio = (typeof REGIO)[keyof typeof REGIO];

/** Gemeenten per regio (zie briefing §5.3, ter bevestiging door de klant). */
const NOORD_LIMBURG = new Set([
  "Venlo",
  "Venray",
  "Horst aan de Maas",
  "Peel en Maas",
  "Beesel",
  "Bergen",
  "Gennep",
  "Mook en Middelaar",
]);

const MIDDEN_LIMBURG = new Set([
  "Roermond",
  "Roerdalen",
  "Leudal",
  "Maasgouw",
  "Echt-Susteren",
  "Nederweert",
  "Weert",
]);

/** Mapping van rommelige bronwaarden naar een nette gemeentenaam. */
const GEMEENTE_ALIASSEN: Record<string, string> = {
  venlo: "Venlo",
  "venlo?": "Venlo",
  horst: "Horst aan de Maas",
  belgie: "België",
  "belgië": "België",
  duitsland: "Duitsland",
};

/** Schoont een ruwe gemeentenaam op tot een gestandaardiseerde waarde. */
export function normaliseerGemeente(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s || s === "0") return null;
  const key = s.toLowerCase();
  if (GEMEENTE_ALIASSEN[key]) return GEMEENTE_ALIASSEN[key];
  // Titlecase-achtige nette weergave: laat bestaande casing intact als die al klopt.
  return s;
}

/** Bepaalt de regio op basis van de (genormaliseerde) gemeentenaam. */
export function bepaalRegio(gemeente: string | null): Regio {
  if (!gemeente) return REGIO.OVERIG;
  if (NOORD_LIMBURG.has(gemeente)) return REGIO.NOORD;
  if (MIDDEN_LIMBURG.has(gemeente)) return REGIO.MIDDEN;
  return REGIO.OVERIG;
}

/**
 * Schoont behandelaar-initialen op.
 * - Verwijdert vraagtekens en witruimte.
 * - Geeft daarnaast een "primaire" behandelaar terug (eerste initialen bij
 *   combinaties als "EA/DR", "VM + MS", "AA + YV").
 */
export function normaliseerBehandelaar(raw: unknown): {
  full: string | null;
  primair: string | null;
} {
  if (raw === null || raw === undefined) return { full: null, primair: null };
  let s = String(raw).trim().replace(/\?/g, "").trim();
  if (!s || s === "0" || s.toLowerCase() === "nvt" || s.toLowerCase() === "ntb") {
    return { full: null, primair: null };
  }
  // Normaliseer scheidingstekens en spaties.
  s = s.replace(/\s+/g, " ");
  const full = s;
  // Primaire behandelaar = stuk vóór de eerste /, + of " en ".
  const primair = s.split(/\s*[/+]\s*|\s+en\s+/i)[0].trim().toUpperCase();
  return { full, primair: primair || null };
}

const MAAND_NAMEN = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
];

/** Maandnaam (in diverse schrijfwijzen) naar maandnummer 1-12, of null. */
export function maandNaarNummer(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().toLowerCase();
  if (!s) return null;
  const idx = MAAND_NAMEN.findIndex((m) => m.startsWith(s.slice(0, 3)));
  return idx >= 0 ? idx + 1 : null;
}

export const MAAND_LABELS = [
  "jan",
  "feb",
  "mrt",
  "apr",
  "mei",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
];

/**
 * Parseert een celwaarde naar een ISO-datum (YYYY-MM-DD) of null.
 * Sluit placeholder-datums uit (jaar < 2000, of een tijd-zonder-datum 00:00:00).
 */
export function parseDatum(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === 0) return null;
  if (raw instanceof Date) {
    const y = raw.getFullYear();
    if (y < 2000 || y > 2100) return null;
    return toISO(raw);
  }
  if (typeof raw === "number") {
    // Excel seriële datum (1900-systeem).
    const d = excelSerialToDate(raw);
    if (!d) return null;
    return toISO(d);
  }
  const s = String(raw).trim();
  if (!s || s === "0" || /^00:00:00$/.test(s)) return null;
  const d = new Date(s);
  if (isNaN(d.getTime()) || d.getFullYear() < 2000) return null;
  return toISO(d);
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function excelSerialToDate(serial: number): Date | null {
  if (serial < 36526) return null; // < jaar 2000
  const ms = (serial - 25569) * 86400 * 1000;
  const d = new Date(ms);
  return isNaN(d.getTime()) ? null : d;
}

/** Doorlooptijd in maanden tussen twee ISO-datums, of null. */
export function doorlooptijdMaanden(
  intakeISO: string | null,
  eindISO: string | null
): number | null {
  if (!intakeISO || !eindISO) return null;
  const a = new Date(intakeISO);
  const b = new Date(eindISO);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
  const dagen = (b.getTime() - a.getTime()) / 86400000;
  if (dagen < 0) return null;
  return Math.round((dagen / 30.4375) * 100) / 100;
}

/** Veilige numerieke parse: lege/"nvt"/tekst → 0 (of null bij allowNull). */
export function toNumber(raw: unknown, allowNull = false): number | null {
  const fallback = allowNull ? null : 0;
  if (raw === null || raw === undefined || raw === "") return fallback;
  if (typeof raw === "number") return isNaN(raw) ? fallback : raw;
  const s = String(raw).trim();
  if (!s || /^(nvt|n\.v\.t\.?|nb|ntb|-)$/i.test(s)) return fallback;
  // Eerst directe parse (puntdecimaal). Lukt dat niet, probeer NL-notatie.
  let n = Number(s);
  if (isNaN(n)) {
    n = Number(s.replace(/\./g, "").replace(",", "."));
  }
  return isNaN(n) ? fallback : n;
}

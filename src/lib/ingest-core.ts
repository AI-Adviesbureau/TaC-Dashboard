/**
 * Herbruikbare inlees- en laadlogica voor het Excel-totaaloverzicht.
 * Gebruikt door zowel het CLI-script (scripts/ingest.ts) als de in-app
 * upload-module (src/app/api/beheer/upload).
 *
 * BELANGRIJK: kolommen BSN / VOORNAAM / ACHTERNAAM / GEB worden NOOIT
 * ingelezen. Alleen het relatienummer wordt als pseudonieme sleutel bewaard.
 * Het geüploade bestand wordt niet op schijf bewaard.
 */
import * as XLSX from "xlsx";
import { sql } from "./db";
import { ensureTrajectUniekView } from "./schema";
import {
  normaliseerGemeente,
  bepaalRegio,
  normaliseerBehandelaar,
  maandNaarNummer,
  parseDatum,
  doorlooptijdMaanden,
  toNumber,
} from "./normalize";

const JAREN = ["2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026"];

/** Bovengrens voor een plausibele maandfacturatie per traject (euro). */
const MAX_MAAND_BEDRAG = 50000;

/** Verboden kolommen — bevatten PII en worden nooit ingelezen. */
const PII_HEADERS = new Set(["bsn", "voornaam", "achternaam", "geb"]);

type Row = (string | number | Date | null)[];
type Issues = Record<string, number>;

function headerMap(row: Row): Map<string, number> {
  const m = new Map<string, number>();
  row.forEach((cell, i) => {
    if (cell === null || cell === undefined) return;
    const key = String(cell).trim().toLowerCase().replace(/\s+/g, " ");
    if (!key) return;
    if (!m.has(key)) m.set(key, i);
  });
  return m;
}

function col(map: Map<string, number>, ...names: string[]): number | null {
  for (const n of names) {
    const i = map.get(n.toLowerCase());
    if (i !== undefined) return i;
  }
  return null;
}

function realisatieMaand(header: string): number | null {
  const h = header.trim().toLowerCase();
  const table: [RegExp, number][] = [
    [/^jan/, 1], [/^feb/, 2], [/^(mrt|maart)/, 3], [/^apr/, 4],
    [/^mei/, 5], [/^jun/, 6], [/^jul/, 7], [/^aug/, 8],
    [/^sep/, 9], [/^okt/, 10], [/^nov/, 11], [/^dec/, 12],
  ];
  for (const [re, n] of table) if (re.test(h)) return n;
  return null;
}

export interface TrajectRecord {
  bron_jaar: number;
  vlgnr: number | null;
  maand_nr: number | null;
  rel_nr: number | null;
  gemeente: string | null;
  regio: string;
  behandelaar: string | null;
  behandelaar_primair: string | null;
  rb: string | null;
  intake: string | null;
  eind: string | null;
  doorlooptijd: number | null;
  lopend: boolean;
  code: string | null;
  bedrag_sp: number;
  bedrag: number;
  omzet: number;
  periode: number | null;
  realisatie: Record<string, number>;
  realisatie_totaal: number;
  inkoop_beh: number;
  inkoop_rb: number;
  eigen_rb: number;
  betaald: boolean;
  betaald_bedrag: number;
  overhead: number;
  openstaand: number;
}

function parseSheet(year: number, rows: Row[], issues: Issues): TrajectRecord[] {
  const bump = (k: string) => (issues[k] = (issues[k] || 0) + 1);
  const out: TrajectRecord[] = [];
  let map: Map<string, number> | null = null;
  let monthCols: [number, number][] = [];

  for (const row of rows) {
    const first = row[0];
    const firstStr = first === null || first === undefined ? "" : String(first).trim();

    if (firstStr.toUpperCase() === "VLGNR" || firstStr.toUpperCase() === "VOLGNR") {
      map = headerMap(row);
      monthCols = [];
      row.forEach((cell, i) => {
        if (cell === null || cell === undefined) return;
        const m = realisatieMaand(String(cell));
        if (m !== null) monthCols.push([i, m]);
      });
      continue;
    }
    if (!map) continue;

    const iRel = col(map, "rel.nr", "rel nr", "relnr");
    const relRaw = iRel !== null ? row[iRel] : null;
    const rel_nr = toNumber(relRaw, true);
    if (rel_nr === null) continue;

    const iGem = col(map, "gemeente");
    const gemeenteRaw = iGem !== null ? row[iGem] : null;
    const gemeente = normaliseerGemeente(gemeenteRaw);
    if (gemeenteRaw && gemeente === null) bump("gemeente_leeg_of_0");
    const regio = bepaalRegio(gemeente);

    const iBeh = col(map, "behandelaar");
    const beh = normaliseerBehandelaar(iBeh !== null ? row[iBeh] : null);
    const iRb = col(map, "rb", "regie");
    const rbNorm = normaliseerBehandelaar(iRb !== null ? row[iRb] : null);

    const iIntake = col(map, "intake/start", "intake", "start zorg", "start");
    const iEind = col(map, "eind", "stop zorg");
    const intake = parseDatum(iIntake !== null ? row[iIntake] : null);
    const eind = parseDatum(iEind !== null ? row[iEind] : null);
    if (iIntake !== null && row[iIntake] && !intake) bump("ongeldige_intake_datum");
    if (iEind !== null && row[iEind] && !eind) bump("ongeldige_eind_datum");

    const iDlt = col(map, "doorlooptijd");
    let doorlooptijd: number | null = null;
    if (iDlt !== null && row[iDlt] !== null && row[iDlt] !== undefined && row[iDlt] !== "") {
      doorlooptijd = toNumber(row[iDlt], true);
    }
    if (doorlooptijd === null) doorlooptijd = doorlooptijdMaanden(intake, eind);
    const lopend = !eind;

    const iCode = col(map, "code");
    let code: string | null = null;
    if (iCode !== null && row[iCode] !== null && row[iCode] !== undefined) {
      const c = String(row[iCode]).trim();
      code = c && c !== "0" ? c : null;
    }
    if (!code) bump("code_ontbreekt");

    const iBsp = col(map, "bedrag sp", "bedrag sp ");
    const iBed = col(map, "bedrag");
    const bedrag_sp = toNumber(iBsp !== null ? row[iBsp] : null) || 0;
    const bedrag = toNumber(iBed !== null ? row[iBed] : null) || 0;
    const omzet = bedrag_sp + bedrag;

    const iPer = col(map, "periode");
    const periode = iPer !== null ? toNumber(row[iPer], true) : null;

    const realisatie: Record<string, number> = {};
    let realisatie_totaal = 0;
    for (const [ci, mn] of monthCols) {
      const v = toNumber(row[ci]);
      if (v && v > 0 && v <= MAX_MAAND_BEDRAG) {
        realisatie[String(mn)] = Math.round(v * 100) / 100;
        realisatie_totaal += v;
      } else if (v && (v > MAX_MAAND_BEDRAG || v < 0)) {
        bump("onwaarschijnlijk_maandbedrag_genegeerd");
      }
    }
    realisatie_totaal = Math.round(realisatie_totaal * 100) / 100;

    const num = (name: string) => {
      const i = col(map!, name);
      return toNumber(i !== null ? row[i] : null) || 0;
    };
    const inkoop_beh = num("inkoopbeh");
    const inkoop_rb = num("inkooprb");
    const eigen_rb = num("eigen rb");
    const overhead = num("20% overhead");
    const openstaand = num("openstaand");
    const betaald_bedrag = num("betaald bedrag");

    const iBetaald = col(map, "betaald");
    let betaald = false;
    if (iBetaald !== null) {
      const bv = row[iBetaald];
      betaald = typeof bv === "string" && /^ja$/i.test(bv.trim());
    }

    const iVlg = col(map, "vlgnr", "volgnr");
    const vlgnr = iVlg !== null ? toNumber(row[iVlg], true) : null;
    const iMaand = col(map, "maand");
    const maand_nr = iMaand !== null ? maandNaarNummer(row[iMaand]) : null;

    out.push({
      bron_jaar: year,
      vlgnr: vlgnr === null ? null : Math.trunc(vlgnr),
      maand_nr,
      rel_nr: Math.trunc(rel_nr),
      gemeente,
      regio,
      behandelaar: beh.full,
      behandelaar_primair: beh.primair,
      rb: rbNorm.primair,
      intake,
      eind,
      doorlooptijd,
      lopend,
      code,
      bedrag_sp,
      bedrag,
      omzet,
      periode,
      realisatie,
      realisatie_totaal,
      inkoop_beh,
      inkoop_rb,
      eigen_rb,
      betaald,
      betaald_bedrag,
      overhead,
      openstaand,
    });
  }
  return out;
}

interface PlekRecord {
  volgnr: number | null;
  maanden: Record<string, number>;
  bezette_maanden: number;
}

function parsePlekken(rows: Row[]): PlekRecord[] {
  const out: PlekRecord[] = [];
  if (rows.length < 2) return out;
  const header = rows[0];
  const monthCols: [number, number][] = [];
  header.forEach((cell, i) => {
    if (cell === null) return;
    const m = realisatieMaand(String(cell));
    if (m !== null) monthCols.push([i, m]);
  });
  for (const row of rows.slice(1)) {
    const volgnr = toNumber(row[0], true);
    if (volgnr === null) continue;
    const maanden: Record<string, number> = {};
    let bezet = 0;
    for (const [ci, mn] of monthCols) {
      const v = toNumber(row[ci]) || 0;
      maanden[String(mn)] = v;
      if (v > 0) bezet++;
    }
    out.push({ volgnr: Math.trunc(volgnr), maanden, bezette_maanden: bezet });
  }
  return out;
}

function parseVenloNorms(rows: Row[]): { code: string; norm: number }[] {
  if (!rows.length) return [];
  const hdr = rows[0];
  const idx = (name: string) =>
    hdr.findIndex((h) => h && String(h).trim().toLowerCase() === name.toLowerCase());
  const ic = idx("productcode");
  const inorm = idx("standaard doorlooptijd");
  if (ic < 0 || inorm < 0) return [];
  const map = new Map<string, number>();
  for (const r of rows.slice(1)) {
    const code = r[ic] ? String(r[ic]).trim() : "";
    const norm = r[inorm];
    if (code && typeof norm === "number" && !isNaN(norm) && !map.has(code)) {
      map.set(code, norm);
    }
  }
  return [...map.entries()].map(([code, norm]) => ({ code, norm }));
}

/* ---------------- DB ---------------- */

export async function createSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS app_user (
      id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
      naam TEXT, created_at TIMESTAMPTZ DEFAULT now()
    )`;
  await sql`DROP TABLE IF EXISTS traject CASCADE`;
  await sql`
    CREATE TABLE traject (
      id SERIAL PRIMARY KEY, bron_jaar INT NOT NULL, vlgnr INT, maand_nr INT, rel_nr INT,
      gemeente TEXT, regio TEXT NOT NULL, behandelaar TEXT, behandelaar_primair TEXT, rb TEXT,
      intake DATE, eind DATE, doorlooptijd NUMERIC, lopend BOOLEAN DEFAULT false, code TEXT,
      bedrag_sp NUMERIC DEFAULT 0, bedrag NUMERIC DEFAULT 0, omzet NUMERIC DEFAULT 0,
      periode NUMERIC, realisatie JSONB, realisatie_totaal NUMERIC DEFAULT 0,
      inkoop_beh NUMERIC DEFAULT 0, inkoop_rb NUMERIC DEFAULT 0, eigen_rb NUMERIC DEFAULT 0,
      betaald BOOLEAN DEFAULT false, betaald_bedrag NUMERIC DEFAULT 0,
      overhead NUMERIC DEFAULT 0, openstaand NUMERIC DEFAULT 0
    )`;
  await sql`CREATE INDEX traject_jaar_idx ON traject (bron_jaar)`;
  await sql`CREATE INDEX traject_regio_idx ON traject (regio)`;
  await sql`CREATE INDEX traject_gemeente_idx ON traject (gemeente)`;
  await sql`CREATE INDEX traject_rel_idx ON traject (rel_nr)`;
  await sql`CREATE INDEX traject_code_idx ON traject (code)`;
  await ensureTrajectUniekView();

  await sql`DROP TABLE IF EXISTS plek`;
  await sql`CREATE TABLE plek (id SERIAL PRIMARY KEY, volgnr INT, maanden JSONB, bezette_maanden INT DEFAULT 0)`;

  await sql`CREATE TABLE IF NOT EXISTS budget_plafond (
      id SERIAL PRIMARY KEY, jaar INT NOT NULL, regio TEXT, gemeente TEXT,
      plafond_bedrag NUMERIC, plekken INT)`;
  await sql`CREATE TABLE IF NOT EXISTS code_omschrijving (code TEXT PRIMARY KEY, omschrijving TEXT)`;
  await sql`CREATE TABLE IF NOT EXISTS behandelaar_naam (initialen TEXT PRIMARY KEY, naam TEXT)`;
  await sql`DROP TABLE IF EXISTS code_norm`;
  await sql`CREATE TABLE code_norm (code TEXT PRIMARY KEY, norm_maanden NUMERIC)`;
  await sql`CREATE TABLE IF NOT EXISTS app_meta (sleutel TEXT PRIMARY KEY, waarde TEXT)`;
}

async function insertTrajecten(records: TrajectRecord[]) {
  const cols = [
    "bron_jaar", "vlgnr", "maand_nr", "rel_nr", "gemeente", "regio",
    "behandelaar", "behandelaar_primair", "rb", "intake", "eind",
    "doorlooptijd", "lopend", "code", "bedrag_sp", "bedrag", "omzet",
    "periode", "realisatie", "realisatie_totaal", "inkoop_beh", "inkoop_rb",
    "eigen_rb", "betaald", "betaald_bedrag", "overhead", "openstaand",
  ];
  const BATCH = 100;
  for (let i = 0; i < records.length; i += BATCH) {
    const slice = records.slice(i, i + BATCH);
    const params: unknown[] = [];
    const valueRows: string[] = [];
    slice.forEach((r) => {
      const vals = [
        r.bron_jaar, r.vlgnr, r.maand_nr, r.rel_nr, r.gemeente, r.regio,
        r.behandelaar, r.behandelaar_primair, r.rb, r.intake, r.eind,
        r.doorlooptijd, r.lopend, r.code, r.bedrag_sp, r.bedrag, r.omzet,
        r.periode, JSON.stringify(r.realisatie), r.realisatie_totaal,
        r.inkoop_beh, r.inkoop_rb, r.eigen_rb, r.betaald, r.betaald_bedrag,
        r.overhead, r.openstaand,
      ];
      const start = params.length;
      vals.forEach((v) => params.push(v));
      valueRows.push(`(${vals.map((_, j) => `$${start + j + 1}`).join(",")})`);
    });
    await sql.query(`INSERT INTO traject (${cols.join(",")}) VALUES ${valueRows.join(",")}`, params);
  }
}

async function insertPlekken(records: PlekRecord[]) {
  const BATCH = 100;
  for (let i = 0; i < records.length; i += BATCH) {
    const slice = records.slice(i, i + BATCH);
    const params: unknown[] = [];
    const valueRows: string[] = [];
    slice.forEach((r) => {
      const start = params.length;
      params.push(r.volgnr, JSON.stringify(r.maanden), r.bezette_maanden);
      valueRows.push(`($${start + 1},$${start + 2},$${start + 3})`);
    });
    await sql.query(`INSERT INTO plek (volgnr, maanden, bezette_maanden) VALUES ${valueRows.join(",")}`, params);
  }
}

export interface IngestSummary {
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
  issues: Issues;
}

/** Leest een (reeds geopende) workbook in, valideert en laadt in Neon. */
export async function ingestWorkbook(wb: XLSX.WorkBook): Promise<IngestSummary> {
  const issues: Issues = {};
  let allRecords: TrajectRecord[] = [];
  const perJaar: Record<string, number> = {};
  let piiGevonden = false;

  for (const y of JAREN) {
    if (!wb.SheetNames.includes(y)) continue;
    const rows = XLSX.utils.sheet_to_json<Row>(wb.Sheets[y], { header: 1, raw: true, defval: null });
    if ((rows[0] as Row | undefined)?.some((c) => c && PII_HEADERS.has(String(c).trim().toLowerCase())))
      piiGevonden = true;
    const recs = parseSheet(parseInt(y, 10), rows, issues);
    perJaar[y] = recs.length;
    allRecords = allRecords.concat(recs);
  }

  if (allRecords.length === 0) {
    throw new Error(
      "Geen trajecten gevonden. Controleer of dit het juiste totaaloverzicht is (tabbladen 2019–2026 met kolom REL.NR)."
    );
  }
  if (piiGevonden) issues["pii_kolommen_genegeerd"] = 1;

  let plekken: PlekRecord[] = [];
  if (wb.SheetNames.includes("Plekken")) {
    plekken = parsePlekken(
      XLSX.utils.sheet_to_json<Row>(wb.Sheets["Plekken"], { header: 1, raw: true, defval: null })
    );
  }
  let normen: { code: string; norm: number }[] = [];
  if (wb.SheetNames.includes("Venlo")) {
    normen = parseVenloNorms(
      XLSX.utils.sheet_to_json<Row>(wb.Sheets["Venlo"], { header: 1, raw: true, defval: null })
    );
  }

  await createSchema();
  await insertTrajecten(allRecords);
  if (plekken.length) await insertPlekken(plekken);
  for (const n of normen) {
    await sql`INSERT INTO code_norm (code, norm_maanden) VALUES (${n.code}, ${n.norm})
      ON CONFLICT (code) DO UPDATE SET norm_maanden = EXCLUDED.norm_maanden`;
  }

  const perRegio: Record<string, number> = {};
  allRecords.forEach((r) => (perRegio[r.regio] = (perRegio[r.regio] || 0) + 1));

  return {
    trajecten: allRecords.length,
    clienten: new Set(allRecords.map((r) => r.rel_nr)).size,
    metDoorlooptijd: allRecords.filter((r) => r.doorlooptijd !== null).length,
    lopend: allRecords.filter((r) => r.lopend).length,
    omzet: Math.round(allRecords.reduce((s, r) => s + r.omzet, 0)),
    inkoop: Math.round(allRecords.reduce((s, r) => s + r.inkoop_beh + r.inkoop_rb, 0)),
    perRegio,
    perJaar,
    normen: normen.length,
    plekken: plekken.length,
    issues,
  };
}

/** Leegt de trajectdata (behoudt gebruikers, plafonds, omschrijvingen, namen). */
export async function wipeData() {
  await sql`CREATE TABLE IF NOT EXISTS app_meta (sleutel TEXT PRIMARY KEY, waarde TEXT)`;
  await sql`DELETE FROM traject`;
  await sql`DELETE FROM plek`;
  await sql`DELETE FROM code_norm`;
  await sql`DELETE FROM app_meta WHERE sleutel = 'laatste_upload'`;
}

export async function setLastUpload(iso: string, bestandsnaam: string) {
  await sql`
    INSERT INTO app_meta (sleutel, waarde) VALUES ('laatste_upload', ${iso})
    ON CONFLICT (sleutel) DO UPDATE SET waarde = EXCLUDED.waarde`;
  await sql`
    INSERT INTO app_meta (sleutel, waarde) VALUES ('laatste_bestand', ${bestandsnaam})
    ON CONFLICT (sleutel) DO UPDATE SET waarde = EXCLUDED.waarde`;
}

export interface DataStatus {
  trajecten: number;
  clienten: number;
  laatsteUpload: string | null;
  laatsteBestand: string | null;
}

/** Huidige status van de geladen data (voor de upload-module). */
export async function getDataStatus(): Promise<DataStatus> {
  const bestaat = (await sql`SELECT to_regclass('public.traject') IS NOT NULL AS ok`) as { ok: boolean }[];
  if (!bestaat[0]?.ok) {
    return { trajecten: 0, clienten: 0, laatsteUpload: null, laatsteBestand: null };
  }
  const t = (await sql`SELECT count(*)::int n, count(distinct rel_nr)::int c FROM traject`) as { n: number; c: number }[];
  let laatsteUpload: string | null = null;
  let laatsteBestand: string | null = null;
  try {
    const m = (await sql`SELECT sleutel, waarde FROM app_meta`) as { sleutel: string; waarde: string }[];
    laatsteUpload = m.find((x) => x.sleutel === "laatste_upload")?.waarde ?? null;
    laatsteBestand = m.find((x) => x.sleutel === "laatste_bestand")?.waarde ?? null;
  } catch {
    /* app_meta bestaat mogelijk nog niet */
  }
  return { trajecten: Number(t[0].n), clienten: Number(t[0].c), laatsteUpload, laatsteBestand };
}

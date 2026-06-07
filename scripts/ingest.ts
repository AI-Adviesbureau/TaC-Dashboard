/**
 * Ingest-script: leest het Excel-totaaloverzicht, normaliseert de data,
 * verwijdert PII en laadt alles in Neon (Postgres).
 *
 * Draaien:  npm run ingest          (gebruikt data/totaaloverzicht.xlsx)
 *           npm run ingest -- pad/naar/bestand.xlsx
 *
 * BELANGRIJK: kolommen BSN / VOORNAAM / ACHTERNAAM / GEB worden NOOIT
 * ingelezen. Alleen het relatienummer wordt als pseudonieme sleutel bewaard.
 */
import * as path from "node:path";
import * as XLSX from "xlsx";
import { neon } from "@neondatabase/serverless";
import {
  normaliseerGemeente,
  bepaalRegio,
  normaliseerBehandelaar,
  maandNaarNummer,
  parseDatum,
  doorlooptijdMaanden,
  toNumber,
} from "../src/lib/normalize";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL ontbreekt. Draai met: node --env-file=.env ...");
  process.exit(1);
}
const sql = neon(DATABASE_URL);

const JAREN = ["2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026"];

/** Bovengrens voor een plausibele maandfacturatie per traject (euro). */
const MAX_MAAND_BEDRAG = 50000;

/** Verboden kolommen — bevatten PII en worden nooit ingelezen. */
const PII_HEADERS = new Set(["bsn", "voornaam", "achternaam", "geb"]);

type Row = (string | number | Date | null)[];

/** Bouwt een map van genormaliseerde header → kolomindex. */
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

/** Maandnummer 1-12 als de header een realisatie-maandkolom is, anders null. */
function realisatieMaand(header: string): number | null {
  const h = header.trim().toLowerCase();
  const table: [RegExp, number][] = [
    [/^jan/, 1],
    [/^feb/, 2],
    [/^(mrt|maart)/, 3],
    [/^apr/, 4],
    [/^mei/, 5],
    [/^jun/, 6],
    [/^jul/, 7],
    [/^aug/, 8],
    [/^sep/, 9],
    [/^okt/, 10],
    [/^nov/, 11],
    [/^dec/, 12],
  ];
  for (const [re, n] of table) if (re.test(h)) return n;
  return null;
}

interface TrajectRecord {
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

const issues: Record<string, number> = {};
function bump(k: string) {
  issues[k] = (issues[k] || 0) + 1;
}

function parseSheet(year: number, rows: Row[]): TrajectRecord[] {
  const out: TrajectRecord[] = [];
  let map: Map<string, number> | null = null;
  // Cache van maandkolommen voor het huidige blok.
  let monthCols: [number, number][] = []; // [colIndex, maandNr]

  for (const row of rows) {
    const first = row[0];
    const firstStr = first === null || first === undefined ? "" : String(first).trim();

    // Nieuwe (herhaalde) kopregel?
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
    if (!map) continue; // data vóór de eerste header negeren

    const iRel = col(map, "rel.nr", "rel nr", "relnr");
    const relRaw = iRel !== null ? row[iRel] : null;
    const rel_nr = toNumber(relRaw, true);
    // Een geldige datarij heeft een relatienummer.
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

    // Doorlooptijd: gebruik bronkolom indien aanwezig, anders bereken.
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
      // Plausibiliteitsgrens: een maandfacturatie per traject is realistisch
      // hooguit enkele duizenden euro's. Grotere/negatieve waarden zijn vervuiling
      // (in oudere tabbladen lekken o.a. BSN-/beschikkingsnummers in maandkolommen);
      // die laten we buiten beschouwing.
      if (v && v > 0 && v <= MAX_MAAND_BEDRAG) {
        realisatie[String(mn)] = Math.round(v * 100) / 100;
        realisatie_totaal += v;
      } else if (v && (v > MAX_MAAND_BEDRAG || v < 0)) {
        bump("onwaarschijnlijk_maandbedrag_genegeerd");
      }
    }
    realisatie_totaal = Math.round(realisatie_totaal * 100) / 100;

    const inkoop_beh = toNumber(col(map, "inkoopbeh") !== null ? row[col(map, "inkoopbeh")!] : null) || 0;
    const inkoop_rb = toNumber(col(map, "inkooprb") !== null ? row[col(map, "inkooprb")!] : null) || 0;
    const eigen_rb = toNumber(col(map, "eigen rb") !== null ? row[col(map, "eigen rb")!] : null) || 0;
    const overhead = toNumber(col(map, "20% overhead") !== null ? row[col(map, "20% overhead")!] : null) || 0;
    const openstaand = toNumber(col(map, "openstaand") !== null ? row[col(map, "openstaand")!] : null) || 0;
    const betaald_bedrag = toNumber(col(map, "betaald bedrag") !== null ? row[col(map, "betaald bedrag")!] : null) || 0;

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

async function createSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS app_user (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      naam TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`;
  await sql`DROP VIEW IF EXISTS traject_uniek`;
  await sql`DROP TABLE IF EXISTS traject`;
  await sql`
    CREATE TABLE traject (
      id SERIAL PRIMARY KEY,
      bron_jaar INT NOT NULL,
      vlgnr INT,
      maand_nr INT,
      rel_nr INT,
      gemeente TEXT,
      regio TEXT NOT NULL,
      behandelaar TEXT,
      behandelaar_primair TEXT,
      rb TEXT,
      intake DATE,
      eind DATE,
      doorlooptijd NUMERIC,
      lopend BOOLEAN DEFAULT false,
      code TEXT,
      bedrag_sp NUMERIC DEFAULT 0,
      bedrag NUMERIC DEFAULT 0,
      omzet NUMERIC DEFAULT 0,
      periode NUMERIC,
      realisatie JSONB,
      realisatie_totaal NUMERIC DEFAULT 0,
      inkoop_beh NUMERIC DEFAULT 0,
      inkoop_rb NUMERIC DEFAULT 0,
      eigen_rb NUMERIC DEFAULT 0,
      betaald BOOLEAN DEFAULT false,
      betaald_bedrag NUMERIC DEFAULT 0,
      overhead NUMERIC DEFAULT 0,
      openstaand NUMERIC DEFAULT 0
    )`;
  await sql`CREATE INDEX traject_jaar_idx ON traject (bron_jaar)`;
  await sql`CREATE INDEX traject_regio_idx ON traject (regio)`;
  await sql`CREATE INDEX traject_gemeente_idx ON traject (gemeente)`;
  await sql`CREATE INDEX traject_rel_idx ON traject (rel_nr)`;
  await sql`CREATE INDEX traject_code_idx ON traject (code)`;

  // View op trajectniveau: meerjarige trajecten staan in elk jaartabblad
  // opnieuw; deze view dedupliceert per (rel_nr, intake) zodat beschikking,
  // inkoop en aantallen niet dubbel tellen. Realisatie (per jaar) wordt juist
  // gesommeerd. Jaar = intakejaar (val terug op bron_jaar als intake ontbreekt).
  await sql`DROP VIEW IF EXISTS traject_uniek`;
  await sql`
    CREATE VIEW traject_uniek AS
    SELECT
      min(id) AS id, rel_nr, min(intake) AS intake, max(eind) AS eind,
      COALESCE(EXTRACT(YEAR FROM min(intake))::int, min(bron_jaar)) AS jaar,
      EXTRACT(MONTH FROM min(intake))::int AS maand_nr,
      (array_agg(gemeente ORDER BY bron_jaar DESC))[1] AS gemeente,
      (array_agg(regio ORDER BY bron_jaar DESC))[1] AS regio,
      (array_agg(behandelaar_primair ORDER BY bron_jaar DESC))[1] AS behandelaar_primair,
      (array_agg(rb ORDER BY bron_jaar DESC))[1] AS rb,
      (array_agg(code ORDER BY bron_jaar DESC))[1] AS code,
      bool_and(lopend) AS lopend, max(doorlooptijd) AS doorlooptijd,
      max(omzet) AS omzet, max(inkoop_beh + inkoop_rb) AS inkoop,
      sum(realisatie_totaal) AS realisatie, sum(overhead) AS overhead,
      sum(betaald_bedrag) AS betaald_bedrag,
      (array_agg(openstaand ORDER BY bron_jaar DESC))[1] AS openstaand,
      bool_or(betaald) AS betaald
    FROM traject
    GROUP BY rel_nr, coalesce(to_char(intake,'YYYY-MM-DD'), 'noid:'||id::text)`;

  await sql`DROP TABLE IF EXISTS plek`;
  await sql`
    CREATE TABLE plek (
      id SERIAL PRIMARY KEY,
      volgnr INT,
      maanden JSONB,
      bezette_maanden INT DEFAULT 0
    )`;

  // Door de gebruiker beheerde referentietabellen — NIET droppen bij re-ingest.
  await sql`
    CREATE TABLE IF NOT EXISTS budget_plafond (
      id SERIAL PRIMARY KEY,
      jaar INT NOT NULL,
      regio TEXT,
      gemeente TEXT,
      plafond_bedrag NUMERIC,
      plekken INT
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS code_omschrijving (
      code TEXT PRIMARY KEY,
      omschrijving TEXT
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS behandelaar_naam (
      initialen TEXT PRIMARY KEY,
      naam TEXT
    )`;

  // Norm-doorlooptijd per code uit het Venlo-tabblad — afgeleid, dus herbouwen.
  await sql`DROP TABLE IF EXISTS code_norm`;
  await sql`
    CREATE TABLE code_norm (
      code TEXT PRIMARY KEY,
      norm_maanden NUMERIC
    )`;
}

/** Leest de standaard (norm) doorlooptijd per productcode uit het Venlo-tabblad. */
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
      const ph = vals.map((_, j) => `$${start + j + 1}`).join(",");
      valueRows.push(`(${ph})`);
    });
    const text = `INSERT INTO traject (${cols.join(",")}) VALUES ${valueRows.join(",")}`;
    await sql.query(text, params);
    process.stdout.write(`\r  ingevoegd: ${Math.min(i + BATCH, records.length)}/${records.length}`);
  }
  process.stdout.write("\n");
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
    const text = `INSERT INTO plek (volgnr, maanden, bezette_maanden) VALUES ${valueRows.join(",")}`;
    await sql.query(text, params);
  }
}

async function main() {
  const file = process.argv[2] || path.join(process.cwd(), "data", "totaaloverzicht.xlsx");
  console.log(`📖 Lees Excel: ${file}`);
  const wb = XLSX.readFile(file, { cellDates: true });

  // Veiligheidscheck: waarschuw als een ingelezen jaartabblad PII-kolommen heeft;
  // die kolommen worden sowieso genegeerd, maar we loggen het.
  let allRecords: TrajectRecord[] = [];
  for (const y of JAREN) {
    if (!wb.SheetNames.includes(y)) {
      console.warn(`  ⚠ tabblad ${y} ontbreekt, overgeslagen`);
      continue;
    }
    const ws = wb.Sheets[y];
    const rows = XLSX.utils.sheet_to_json<Row>(ws, { header: 1, raw: true, defval: null });
    const piiFound = (rows[0] as Row | undefined)?.some(
      (c) => c && PII_HEADERS.has(String(c).trim().toLowerCase())
    );
    if (piiFound) console.log(`  🔒 ${y}: PII-kolommen gedetecteerd → genegeerd (alleen REL.NR bewaard)`);
    const recs = parseSheet(parseInt(y, 10), rows);
    console.log(`  ✓ ${y}: ${recs.length} trajecten`);
    allRecords = allRecords.concat(recs);
  }

  let plekken: PlekRecord[] = [];
  if (wb.SheetNames.includes("Plekken")) {
    const rows = XLSX.utils.sheet_to_json<Row>(wb.Sheets["Plekken"], {
      header: 1, raw: true, defval: null,
    });
    plekken = parsePlekken(rows);
    console.log(`  ✓ Plekken: ${plekken.length} registraties`);
  }

  let normen: { code: string; norm: number }[] = [];
  if (wb.SheetNames.includes("Venlo")) {
    const rows = XLSX.utils.sheet_to_json<Row>(wb.Sheets["Venlo"], {
      header: 1, raw: true, defval: null,
    });
    normen = parseVenloNorms(rows);
    console.log(`  ✓ Venlo-normen: ${normen.length} productcodes met norm-doorlooptijd`);
  }

  console.log("\n🗄  Schema aanmaken...");
  await createSchema();
  console.log("⬆  Trajecten laden...");
  await insertTrajecten(allRecords);
  if (plekken.length) {
    console.log("⬆  Plekken laden...");
    await insertPlekken(plekken);
  }
  for (const n of normen) {
    await sql`INSERT INTO code_norm (code, norm_maanden) VALUES (${n.code}, ${n.norm})
      ON CONFLICT (code) DO UPDATE SET norm_maanden = EXCLUDED.norm_maanden`;
  }

  // Samenvatting
  const uniekeRels = new Set(allRecords.map((r) => r.rel_nr)).size;
  const metDoorlooptijd = allRecords.filter((r) => r.doorlooptijd !== null).length;
  const lopend = allRecords.filter((r) => r.lopend).length;
  const totOmzet = allRecords.reduce((s, r) => s + r.omzet, 0);
  const totInkoop = allRecords.reduce((s, r) => s + r.inkoop_beh + r.inkoop_rb, 0);
  const perRegio: Record<string, number> = {};
  allRecords.forEach((r) => (perRegio[r.regio] = (perRegio[r.regio] || 0) + 1));

  console.log("\n" + "=".repeat(56));
  console.log("📊 DATASAMENVATTING");
  console.log("=".repeat(56));
  console.log(`Totaal trajecten:        ${allRecords.length}`);
  console.log(`Unieke cliënten (REL):   ${uniekeRels}`);
  console.log(`Met doorlooptijd:        ${metDoorlooptijd}`);
  console.log(`Lopend (geen einddatum): ${lopend}`);
  console.log(`Totale omzet/budget:     € ${totOmzet.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}`);
  console.log(`Totale inkoopkosten:     € ${totInkoop.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}`);
  console.log(`Per regio:               ${JSON.stringify(perRegio)}`);
  console.log("\n⚠ Datakwaliteit-signalen:");
  Object.entries(issues)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`   ${k}: ${v}`));
  console.log("\n✅ Klaar.");
}

main().catch((e) => {
  console.error("\n❌ Ingest mislukt:", e);
  process.exit(1);
});

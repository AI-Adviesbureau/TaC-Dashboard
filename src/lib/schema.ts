import "server-only";
import { sql } from "./db";

/**
 * Eén rij per traject per Excel-lijst (tabblad/jaar).
 * bron_jaar = welke lijst (2026, 2025, …); jaar is hetzelfde (filter op lijst).
 */
export const TRAJECT_LIJST_VIEW_SQL = `
  CREATE VIEW traject_lijst AS
  SELECT
    min(id) AS id,
    bron_jaar,
    rel_nr,
    min(intake) AS intake,
    max(eind) AS eind,
    bron_jaar AS jaar,
    EXTRACT(MONTH FROM min(intake))::int AS maand_nr,
    (array_agg(gemeente ORDER BY id DESC))[1] AS gemeente,
    (array_agg(regio ORDER BY id DESC))[1] AS regio,
    (array_agg(behandelaar_primair ORDER BY id DESC))[1] AS behandelaar_primair,
    (array_agg(rb ORDER BY id DESC))[1] AS rb,
    (array_agg(code ORDER BY id DESC))[1] AS code,
    bool_and(lopend) AS lopend,
    max(doorlooptijd) AS doorlooptijd,
    max(omzet) AS omzet,
    max(NULLIF(periode, 0)) AS periode,
    max(inkoop_beh + inkoop_rb) AS inkoop,
    sum(realisatie_totaal) AS realisatie,
    sum(overhead) AS overhead,
    sum(betaald_bedrag) AS betaald_bedrag,
    (array_agg(openstaand ORDER BY id DESC))[1] AS openstaand,
    bool_or(betaald) AS betaald
  FROM traject
  GROUP BY bron_jaar, rel_nr, coalesce(to_char(intake,'YYYY-MM-DD'), 'noid:'||id::text)`;

/** @deprecated Alleen nog voor legacy; app gebruikt traject_lijst. */
export const TRAJECT_UNIEK_VIEW_SQL = `
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
    max(omzet) AS omzet,
    max(NULLIF(periode, 0)) AS periode,
    max(inkoop_beh + inkoop_rb) AS inkoop,
    sum(realisatie_totaal) AS realisatie, sum(overhead) AS overhead,
    sum(betaald_bedrag) AS betaald_bedrag,
    (array_agg(openstaand ORDER BY bron_jaar DESC))[1] AS openstaand,
    bool_or(betaald) AS betaald
  FROM traject
  GROUP BY rel_nr, coalesce(to_char(intake,'YYYY-MM-DD'), 'noid:'||id::text)`;

let viewsReady: Promise<void> | null = null;

/** Zorgt dat traject_lijst (en legacy traject_uniek) bestaan. Idempotent. */
export async function ensureTrajectUniekView() {
  if (!viewsReady) {
    viewsReady = (async () => {
      const traject = (await sql`
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'traject'
        LIMIT 1
      `) as unknown[];
      if (!traject.length) return;

      const cols = (await sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'traject_lijst'
      `) as { column_name: string }[];
      if (cols.some((c) => c.column_name === "bron_jaar")) return;

      await sql`DROP VIEW IF EXISTS traject_uniek`;
      await sql`DROP VIEW IF EXISTS traject_lijst`;
      await sql.query(TRAJECT_LIJST_VIEW_SQL.trim(), []);
      await sql.query(TRAJECT_UNIEK_VIEW_SQL.trim(), []);
    })().catch((e) => {
      viewsReady = null;
      throw e;
    });
  }
  await viewsReady;
}

/** Bron-tabel voor alle dashboard-queries: per Excel-lijst (tabblad). */
export const TRAJECT_BRON = "traject_lijst";

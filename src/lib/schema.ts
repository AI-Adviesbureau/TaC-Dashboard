import "server-only";
import { sql } from "./db";

/** SQL-definitie van de ontdubbelde trajecten-view (1 rij per rel_nr + intake). */
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

let viewReady: Promise<void> | null = null;

/** Zorgt dat traject_uniek de actuele kolommen heeft (o.a. periode). Idempotent. */
export async function ensureTrajectUniekView() {
  if (!viewReady) {
    viewReady = (async () => {
      const traject = (await sql`
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'traject'
        LIMIT 1
      `) as unknown[];
      if (!traject.length) return;

      const cols = (await sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'traject_uniek'
      `) as { column_name: string }[];
      if (cols.length > 0 && cols.some((c) => c.column_name === "periode")) return;

      await sql`DROP VIEW IF EXISTS traject_uniek`;
      await sql.query(TRAJECT_UNIEK_VIEW_SQL.trim(), []);
    })().catch((e) => {
      viewReady = null;
      throw e;
    });
  }
  await viewReady;
}

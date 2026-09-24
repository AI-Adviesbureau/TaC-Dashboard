// Geen "server-only": ook bruikbaar vanuit scripts. Bevat geen geheimen.
import { sql } from "./db";

/**
 * Zorgvorm-indeling zoals het gemeentedashboard (Jeugdmonitor) die hanteert.
 * Afgeleid uit de reconciliatie met de gemeentecijfers (sept 2026):
 *  - 45xxx  → Ambulante hulp
 *  - 50xxx en 54R03 → Brede Analyse
 *  - overige 54xxx → GGZ
 * Per code te corrigeren in Beheer → Productcodes (tabel code_zorgvorm).
 */
export const ZORGVORMEN = ["Ambulante hulp", "Brede Analyse", "GGZ", "Overig"] as const;
export type Zorgvorm = (typeof ZORGVORMEN)[number];

/** Standaardregel wanneer een code niet expliciet is toegewezen. */
export function zorgvormStandaard(code: string | null | undefined): Zorgvorm {
  if (!code) return "Overig";
  const c = code.toUpperCase();
  if (c === "54R03") return "Brede Analyse";
  if (c.startsWith("50")) return "Brede Analyse";
  if (c.startsWith("54")) return "GGZ";
  if (c.startsWith("45")) return "Ambulante hulp";
  return "Overig";
}

/** SQL-expressie voor de zorgvorm van alias `t` (verwacht LEFT JOIN code_zorgvorm cz ON cz.code = t.code). */
export const ZORGVORM_SQL = `COALESCE(cz.zorgvorm,
  CASE
    WHEN upper(t.code) = '54R03' THEN 'Brede Analyse'
    WHEN t.code LIKE '50%' THEN 'Brede Analyse'
    WHEN t.code LIKE '54%' THEN 'GGZ'
    WHEN t.code LIKE '45%' THEN 'Ambulante hulp'
    ELSE 'Overig'
  END)`;

export const ZORGVORM_JOIN = `LEFT JOIN code_zorgvorm cz ON cz.code = t.code`;

let tabelKlaar: Promise<void> | null = null;
/** Zorgt dat code_zorgvorm bestaat (idempotent; wordt nooit gedropt bij ingest). */
export async function ensureZorgvormTabel() {
  if (!tabelKlaar) {
    tabelKlaar = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS code_zorgvorm (code TEXT PRIMARY KEY, zorgvorm TEXT NOT NULL)`;
    })().catch((e) => {
      tabelKlaar = null;
      throw e;
    });
  }
  await tabelKlaar;
}

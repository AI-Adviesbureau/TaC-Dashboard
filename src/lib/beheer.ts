import "server-only";
import { sql } from "./db";

/* ---------- Budgetplafonds ---------- */

export interface Plafond {
  id: number;
  jaar: number;
  regio: string | null;
  gemeente: string | null;
  plafond_bedrag: number | null;
  plekken: number | null;
}

export async function listPlafonds(): Promise<Plafond[]> {
  const rows = (await sql`
    SELECT id, jaar, regio, gemeente, plafond_bedrag, plekken
    FROM budget_plafond ORDER BY jaar DESC, gemeente NULLS FIRST, regio NULLS FIRST
  `) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: Number(r.id),
    jaar: Number(r.jaar),
    regio: (r.regio as string) ?? null,
    gemeente: (r.gemeente as string) ?? null,
    plafond_bedrag: r.plafond_bedrag === null ? null : Number(r.plafond_bedrag),
    plekken: r.plekken === null ? null : Number(r.plekken),
  }));
}

export async function addPlafond(p: Omit<Plafond, "id">): Promise<void> {
  await sql`
    INSERT INTO budget_plafond (jaar, regio, gemeente, plafond_bedrag, plekken)
    VALUES (${p.jaar}, ${p.regio}, ${p.gemeente}, ${p.plafond_bedrag}, ${p.plekken})`;
}

export async function deletePlafond(id: number): Promise<void> {
  await sql`DELETE FROM budget_plafond WHERE id = ${id}`;
}

/* ---------- Productcodes ---------- */

export interface CodeRow {
  code: string;
  aantal: number;
  omschrijving: string | null;
  norm_maanden: number | null;
}

export async function listCodes(): Promise<CodeRow[]> {
  const rows = (await sql`
    SELECT t.code,
      count(*)::int AS aantal,
      co.omschrijving,
      cn.norm_maanden
    FROM traject t
    LEFT JOIN code_omschrijving co ON co.code = t.code
    LEFT JOIN code_norm cn ON cn.code = t.code
    WHERE t.code IS NOT NULL
    GROUP BY t.code, co.omschrijving, cn.norm_maanden
    ORDER BY aantal DESC
  `) as Record<string, unknown>[];
  return rows.map((r) => ({
    code: String(r.code),
    aantal: Number(r.aantal),
    omschrijving: (r.omschrijving as string) ?? null,
    norm_maanden: r.norm_maanden === null ? null : Number(r.norm_maanden),
  }));
}

export async function upsertCode(code: string, omschrijving: string | null): Promise<void> {
  if (omschrijving && omschrijving.trim()) {
    await sql`
      INSERT INTO code_omschrijving (code, omschrijving)
      VALUES (${code}, ${omschrijving.trim()})
      ON CONFLICT (code) DO UPDATE SET omschrijving = EXCLUDED.omschrijving`;
  } else {
    await sql`DELETE FROM code_omschrijving WHERE code = ${code}`;
  }
}

/* ---------- Behandelaren (initialen → naam) ---------- */

export interface BehandelaarRow {
  initialen: string;
  aantal: number;
  naam: string | null;
}

export async function listBehandelaarNamen(): Promise<BehandelaarRow[]> {
  const rows = (await sql`
    WITH alle AS (
      SELECT behandelaar_primair AS initialen FROM traject WHERE behandelaar_primair IS NOT NULL
      UNION ALL
      SELECT rb FROM traject WHERE rb IS NOT NULL
    )
    SELECT a.initialen, count(*)::int AS aantal, bn.naam
    FROM alle a
    LEFT JOIN behandelaar_naam bn ON bn.initialen = a.initialen
    GROUP BY a.initialen, bn.naam
    ORDER BY aantal DESC
  `) as Record<string, unknown>[];
  return rows.map((r) => ({
    initialen: String(r.initialen),
    aantal: Number(r.aantal),
    naam: (r.naam as string) ?? null,
  }));
}

export async function upsertBehandelaar(initialen: string, naam: string | null): Promise<void> {
  if (naam && naam.trim()) {
    await sql`
      INSERT INTO behandelaar_naam (initialen, naam)
      VALUES (${initialen}, ${naam.trim()})
      ON CONFLICT (initialen) DO UPDATE SET naam = EXCLUDED.naam`;
  } else {
    await sql`DELETE FROM behandelaar_naam WHERE initialen = ${initialen}`;
  }
}

/** Lookup-maps voor weergave elders in de app. */
export async function getCodeOmschrijvingen(): Promise<Record<string, string>> {
  const rows = (await sql`SELECT code, omschrijving FROM code_omschrijving`) as {
    code: string;
    omschrijving: string;
  }[];
  const m: Record<string, string> = {};
  for (const r of rows) if (r.omschrijving) m[r.code] = r.omschrijving;
  return m;
}

import "server-only";
import { sql } from "./db";
import type { Filters } from "./kpi";
import { addGemeenteFilter } from "./filter-sql";
import { ensureTrajectUniekView, TRAJECT_BRON } from "./schema";
import type { TrajectRow } from "./types";

export type { TrajectRow };

const SORT_KOLOMMEN: Record<string, string> = {
  intake: "intake",
  eind: "eind",
  doorlooptijd: "doorlooptijd",
  omzet: "omzet",
  gemeente: "gemeente",
  code: "code",
  jaar: "jaar",
  rel_nr: "rel_nr",
};

export interface TrajectFilters extends Filters {
  lopend?: string | null; // "ja" | "nee"
  betaald?: string | null; // "ja" | "open"
}

function buildWhere(f: TrajectFilters, search?: string) {
  const parts: string[] = [];
  const params: unknown[] = [];
  const add = (cond: (n: number) => string, val: unknown) => {
    params.push(val);
    parts.push(cond(params.length));
  };
  if (f.regio && f.regio !== "Totaal") add((n) => `t.regio = $${n}`, f.regio);
  if (f.jaar) add((n) => `t.bron_jaar = $${n}`, f.jaar);
  if (f.maand) add((n) => `t.maand_nr = $${n}`, f.maand);
  if (f.van) add((n) => `t.intake >= $${n}`, f.van);
  if (f.tot) add((n) => `t.intake <= $${n}`, f.tot);
  addGemeenteFilter(f.gemeente, "t", add);
  if (f.code) add((n) => `t.code = $${n}`, f.code);
  if (f.behandelaar) add((n) => `t.behandelaar_primair = $${n}`, f.behandelaar);
  if (f.rb) add((n) => `t.rb = $${n}`, f.rb);
  if (f.lopend === "ja") parts.push("t.lopend = true");
  if (f.lopend === "nee") parts.push("t.lopend = false");
  if (f.betaald === "ja") parts.push("t.betaald = true");
  if (f.betaald === "open") parts.push("(t.betaald = false AND t.openstaand > 0)");
  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    params.push(s);
    const n = params.length;
    parts.push(
      `(t.rel_nr::text ILIKE $${n} OR t.gemeente ILIKE $${n} OR t.code ILIKE $${n} OR t.behandelaar_primair ILIKE $${n} OR t.rb ILIKE $${n})`
    );
  }
  return { clause: parts.length ? "WHERE " + parts.join(" AND ") : "", params };
}

/** SELECT-lijst (zonder FROM) gedeeld door lijst en detail. */
const SELECT_COLS = `t.id, t.jaar, t.rel_nr, t.gemeente, t.regio, t.behandelaar_primair AS behandelaar, t.rb,
  to_char(t.intake, 'YYYY-MM-DD') AS intake,
  to_char(t.eind, 'YYYY-MM-DD') AS eind,
  t.doorlooptijd, t.lopend, t.code, co.omschrijving AS code_omschrijving, cn.norm_maanden,
  t.omzet, t.realisatie AS gerealiseerd, t.inkoop,
  (t.realisatie - t.inkoop - t.overhead) AS marge,
  t.overhead, t.betaald, t.betaald_bedrag, t.openstaand`;

const JOINS = `LEFT JOIN code_omschrijving co ON co.code = t.code
  LEFT JOIN code_norm cn ON cn.code = t.code`;

export async function getTrajecten(
  f: TrajectFilters,
  opts: { search?: string; sort?: string; dir?: string; limit?: number; offset?: number } = {}
): Promise<{ rows: TrajectRow[]; total: number }> {
  await ensureTrajectUniekView();
  const { clause, params } = buildWhere(f, opts.search);
  const sortCol = SORT_KOLOMMEN[opts.sort ?? "intake"] ?? "intake";
  const dir = opts.dir === "asc" ? "ASC" : "DESC";
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 500);
  const offset = Math.max(opts.offset ?? 0, 0);

  const countText = `SELECT count(*)::int AS n FROM ${TRAJECT_BRON} t ${clause}`;
  const countRows = (await sql.query(countText, params)) as { n: number }[];
  const total = Number(countRows[0].n);

  const dataParams = [...params, limit, offset];
  const dataText = `
    SELECT ${SELECT_COLS}
    FROM ${TRAJECT_BRON} t ${JOINS} ${clause}
    ORDER BY t.${sortCol} ${dir} NULLS LAST, t.id DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const rows = (await sql.query(dataText, dataParams)) as Record<string, unknown>[];
  return { rows: rows.map(mapRow), total };
}

export async function getTrajectDetail(id: number): Promise<TrajectRow | null> {
  await ensureTrajectUniekView();
  const rows = (await sql.query(
    `SELECT ${SELECT_COLS} FROM ${TRAJECT_BRON} t ${JOINS} WHERE t.id = $1`,
    [id]
  )) as Record<string, unknown>[];
  return rows[0] ? mapRow(rows[0]) : null;
}

function mapRow(r: Record<string, unknown>): TrajectRow {
  return {
    id: Number(r.id),
    jaar: Number(r.jaar),
    rel_nr: r.rel_nr === null ? null : Number(r.rel_nr),
    gemeente: (r.gemeente as string) ?? null,
    regio: String(r.regio),
    behandelaar: (r.behandelaar as string) ?? null,
    rb: (r.rb as string) ?? null,
    intake: (r.intake as string) ?? null,
    eind: (r.eind as string) ?? null,
    doorlooptijd: r.doorlooptijd === null ? null : Number(r.doorlooptijd),
    lopend: Boolean(r.lopend),
    code: (r.code as string) ?? null,
    code_omschrijving: (r.code_omschrijving as string) ?? null,
    norm_maanden: r.norm_maanden === null || r.norm_maanden === undefined ? null : Number(r.norm_maanden),
    omzet: Number(r.omzet),
    gerealiseerd: Number(r.gerealiseerd),
    inkoop: Number(r.inkoop),
    marge: Number(r.marge),
    overhead: Number(r.overhead),
    betaald: Boolean(r.betaald),
    betaald_bedrag: Number(r.betaald_bedrag),
    openstaand: Number(r.openstaand),
  };
}

/** Kosten & budget: per gemeente kosten/omzet/marge + plekkenbezetting per maand. */
export async function getKosten(f: Filters) {
  await ensureTrajectUniekView();
  const { clause, params } = buildWhere(f);
  const perGemeenteText = `
    SELECT t.gemeente, t.regio,
      count(*)::int AS aantal,
      count(distinct t.rel_nr)::int AS clienten,
      coalesce(sum(t.inkoop),0) AS inkoop,
      coalesce(sum(t.omzet),0) AS omzet,
      coalesce(sum(t.realisatie),0) AS gerealiseerd,
      coalesce(sum(t.overhead),0) AS overhead,
      coalesce(sum(t.realisatie - t.inkoop - t.overhead),0) AS marge,
      coalesce(sum(t.openstaand),0) AS openstaand
    FROM ${TRAJECT_BRON} t ${clause ? clause + " AND" : "WHERE"} t.gemeente IS NOT NULL
    GROUP BY t.gemeente, t.regio ORDER BY omzet DESC`;
  const perGemeente = (await sql.query(perGemeenteText, params)) as Record<string, unknown>[];

  // Plekkenbezetting per maand (uit het tabblad 'Plekken').
  const plekRows = (await sql`
    SELECT key::int AS maand, sum((value)::numeric)::int AS bezet
    FROM plek, jsonb_each_text(maanden)
    GROUP BY key ORDER BY maand
  `) as { maand: number; bezet: number }[];
  const namen = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  const plekken = namen.map((label, i) => ({
    maand: label,
    bezet: Number(plekRows.find((r) => Number(r.maand) === i + 1)?.bezet ?? 0),
  }));

  // Aangeleverde budgetplafonds (indien aanwezig).
  const plafondParams: unknown[] = [];
  const pConds: string[] = [];
  if (f.jaar) {
    plafondParams.push(f.jaar);
    pConds.push(`jaar = $${plafondParams.length}`);
  }
  if (f.regio && f.regio !== "Totaal") {
    plafondParams.push(f.regio);
    pConds.push(`(regio = $${plafondParams.length} OR regio IS NULL)`);
  }
  const plafondText = `SELECT jaar, regio, gemeente, plafond_bedrag, plekken FROM budget_plafond ${
    pConds.length ? "WHERE " + pConds.join(" AND ") : ""
  } ORDER BY gemeente NULLS FIRST`;
  const plafonds = (await sql.query(plafondText, plafondParams)) as Record<string, unknown>[];

  return {
    perGemeente: perGemeente.map((r) => ({
      gemeente: String(r.gemeente),
      regio: String(r.regio),
      aantal: Number(r.aantal),
      clienten: Number(r.clienten),
      inkoop: Number(r.inkoop),
      omzet: Number(r.omzet),
      gerealiseerd: Number(r.gerealiseerd),
      overhead: Number(r.overhead),
      marge: Number(r.marge),
      openstaand: Number(r.openstaand),
      kostenPerClient: Number(r.clienten) > 0 ? Number(r.inkoop) / Number(r.clienten) : null,
    })),
    plekken,
    plafonds: plafonds.map((r) => ({
      jaar: Number(r.jaar),
      regio: (r.regio as string) ?? null,
      gemeente: (r.gemeente as string) ?? null,
      plafond_bedrag: r.plafond_bedrag === null ? null : Number(r.plafond_bedrag),
      plekken: r.plekken === null ? null : Number(r.plekken),
    })),
  };
}

import "server-only";
import { sql } from "./db";
import type { Filters } from "./kpi";
import { addGemeenteFilter, realisatieTmExpr } from "./filter-sql";
import { ensureTrajectUniekView, TRAJECT_BRON } from "./schema";
import { plafondTotaal, plafondPerGemeente } from "./budget";

/**
 * Jeugdmonitor: cijfers volgens de definities van het gemeentedashboard
 * (Sociaal Domein Limburg-Noord, Power BI), zodat 1-op-1 vergeleken kan worden:
 * - realisatie = gedeclareerd t/m maand (som maandkolommen op de jaarlijst)
 * - actieve cliënten = unieke cliënten met een declaratie t/m maand
 * - kosten per cliënt = realisatie ÷ actieve cliënten
 * - budgetverbruik = realisatie ÷ plafond; prognose = lineaire extrapolatie
 */

export const MAAND_KORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

export interface MonitorKern {
  jaar: number;
  tm: number;
  realisatie: number;
  actieveClienten: number;
  kostenPerClient: number | null;
  plafond: number | null;
  verbruikPct: number | null;
  prognose: number;
  prognosePct: number | null;
}

export interface MonitorGemeenteRow {
  gemeente: string;
  actieveClienten: number;
  gedeclareerd: number;
  kostenPerClient: number | null;
  plafond: number | null;
  verbruikPct: number | null;
  prognose: number;
  prognosePct: number | null;
}

export interface MonitorMaand {
  maand: number;
  label: string;
  /** cumulatief gedeclareerd dit jaar (t/m tm), daarna null */
  cumulatief: number | null;
  /** lineaire prognose vanaf tm */
  prognose: number | null;
  /** cumulatief gedeclareerd vorig jaar (hele jaar) */
  cumulatiefVorig: number | null;
  gedeclareerd: number | null;
  toegewezen: number | null;
  gedeclareerdVorig: number | null;
  toegewezenVorig: number | null;
}

export interface MonitorData {
  jaar: number;
  vorigJaar: number;
  tm: number;
  tmAutomatisch: boolean;
  huidig: MonitorKern;
  vorig: MonitorKern;
  groei: { realisatie: number | null; actieveClienten: number | null; kostenPerClient: number | null };
  perGemeente: MonitorGemeenteRow[];
  maanden: MonitorMaand[];
}

function pct(a: number | null, b: number | null): number | null {
  if (a === null || b === null || b === 0) return null;
  return Math.round(((a - b) / Math.abs(b)) * 1000) / 10;
}

function prognoseLineair(realisatie: number, tm: number): number {
  if (tm >= 12 || tm <= 0) return realisatie;
  return Math.round(realisatie + (realisatie / tm) * (12 - tm));
}

/** WHERE voor lijst-jaar + regio/gemeente (zonder maand; die zit in de expressies). */
function whereBasis(f: Filters, jaren: number[], alias = "t") {
  const parts: string[] = [];
  const params: unknown[] = [];
  const add = (cond: (n: number) => string, val: unknown) => {
    params.push(val);
    parts.push(cond(params.length));
  };
  params.push(jaren);
  parts.push(`${alias}.bron_jaar = ANY($${params.length}::int[])`);
  if (f.regio && f.regio !== "Totaal") add((n) => `${alias}.regio = $${n}`, f.regio);
  addGemeenteFilter(f.gemeente, alias, add);
  return { clause: "WHERE " + parts.join(" AND "), params, add, parts };
}

async function kern(f: Filters, jaar: number, tm: number): Promise<MonitorKern> {
  const R = realisatieTmExpr(tm);
  const { clause, params } = whereBasis(f, [jaar]);
  const rows = (await sql.query(
    `SELECT count(distinct rel_nr) FILTER (WHERE ${R} > 0)::int AS actieve,
            coalesce(sum(${R}),0) AS realisatie
     FROM ${TRAJECT_BRON} t ${clause}`,
    params
  )) as { actieve: number; realisatie: number }[];
  const realisatie = Number(rows[0].realisatie);
  const actieve = Number(rows[0].actieve);
  const { bedrag: plafond } = await plafondTotaal({
    jaar,
    regio: f.regio,
    gemeente: f.gemeente,
    basis: f.budgetBasis,
  });
  const prognose = prognoseLineair(realisatie, tm);
  return {
    jaar,
    tm,
    realisatie,
    actieveClienten: actieve,
    kostenPerClient: actieve > 0 ? Math.round(realisatie / actieve) : null,
    plafond,
    verbruikPct: plafond && plafond > 0 ? Math.round((realisatie / plafond) * 1000) / 10 : null,
    prognose,
    prognosePct: plafond && plafond > 0 ? Math.round((prognose / plafond) * 1000) / 10 : null,
  };
}

async function perGemeente(f: Filters, jaar: number, tm: number): Promise<MonitorGemeenteRow[]> {
  const R = realisatieTmExpr(tm);
  const { clause, params } = whereBasis(f, [jaar]);
  const rows = (await sql.query(
    `SELECT gemeente,
            count(distinct rel_nr) FILTER (WHERE ${R} > 0)::int AS actieve,
            coalesce(sum(${R}),0) AS gedeclareerd
     FROM ${TRAJECT_BRON} t ${clause} AND gemeente IS NOT NULL
     GROUP BY gemeente ORDER BY gedeclareerd DESC, gemeente`,
    params
  )) as { gemeente: string; actieve: number; gedeclareerd: number }[];
  const plafonds = await plafondPerGemeente(jaar, f.budgetBasis);
  const plafondVan = (g: string) => plafonds.get(g) ?? null;
  return rows
    .filter((r) => Number(r.actieve) > 0 || Number(r.gedeclareerd) > 0)
    .map((r) => {
      const ged = Number(r.gedeclareerd);
      const act = Number(r.actieve);
      const plafond = plafondVan(r.gemeente);
      const prognose = prognoseLineair(ged, tm);
      return {
        gemeente: r.gemeente,
        actieveClienten: act,
        gedeclareerd: ged,
        kostenPerClient: act > 0 ? Math.round(ged / act) : null,
        plafond,
        verbruikPct: plafond && plafond > 0 ? Math.round((ged / plafond) * 1000) / 10 : null,
        prognose,
        prognosePct: plafond && plafond > 0 ? Math.round((prognose / plafond) * 1000) / 10 : null,
      };
    });
}

interface MaandRij {
  bron_jaar: number;
  m: number[];
  a: number[];
  t: number[];
}

/** Per maand: gedeclareerd bedrag, actieve (gedeclareerde) en toegewezen cliënten — voor 2 jaarlijsten. */
async function perMaand(f: Filters, jaren: number[]): Promise<MaandRij[]> {
  const { clause, params } = whereBasis(f, jaren);
  const cols: string[] = [];
  for (let m = 1; m <= 12; m++) {
    cols.push(`coalesce(sum(t.r${m}),0) AS m${m}`);
    cols.push(`count(distinct t.rel_nr) FILTER (WHERE t.r${m} > 0)::int AS a${m}`);
    cols.push(
      `count(distinct t.rel_nr) FILTER (WHERE t.intake IS NOT NULL
         AND t.intake <= (make_date(t.bron_jaar, ${m}, 1) + interval '1 month' - interval '1 day')::date
         AND (t.eind IS NULL OR t.eind >= make_date(t.bron_jaar, ${m}, 1)))::int AS t${m}`
    );
  }
  const rows = (await sql.query(
    `SELECT t.bron_jaar, ${cols.join(", ")} FROM ${TRAJECT_BRON} t ${clause} GROUP BY t.bron_jaar`,
    params
  )) as Record<string, unknown>[];
  return rows.map((r) => ({
    bron_jaar: Number(r.bron_jaar),
    m: Array.from({ length: 12 }, (_, i) => Number(r[`m${i + 1}`])),
    a: Array.from({ length: 12 }, (_, i) => Number(r[`a${i + 1}`])),
    t: Array.from({ length: 12 }, (_, i) => Number(r[`t${i + 1}`])),
  }));
}

export async function getMonitor(f: Filters): Promise<MonitorData> {
  await ensureTrajectUniekView();

  let jaar = f.jaar ?? null;
  if (!jaar) {
    const r = (await sql`SELECT max(bron_jaar)::int AS j FROM traject`) as { j: number | null }[];
    jaar = r[0]?.j ?? new Date().getFullYear();
  }
  const nu = new Date();
  // Zonder maandkeuze: voor het lopende jaar t/m vorige maand (facturatie loopt
  // ± een maand achter), voor afgeronde jaren de hele lijst.
  const tmAutomatisch = !f.maand;
  const tm = f.maand ?? (jaar === nu.getFullYear() ? Math.max(1, Math.min(12, nu.getMonth())) : 12);
  const vorigJaar = jaar - 1;

  const [huidig, vorig, gemeenten, maandRijen] = await Promise.all([
    kern(f, jaar, tm),
    kern(f, vorigJaar, tm),
    perGemeente(f, jaar, tm),
    perMaand(f, [jaar, vorigJaar]),
  ]);

  const dit = maandRijen.find((r) => r.bron_jaar === jaar);
  const vor = maandRijen.find((r) => r.bron_jaar === vorigJaar);
  const maanden: MonitorMaand[] = [];
  let cum = 0;
  let cumVorig = 0;
  const gemPerMaand = tm > 0 ? huidig.realisatie / tm : 0;
  for (let m = 1; m <= 12; m++) {
    const bedrag = dit ? dit.m[m - 1] : 0;
    if (m <= tm) cum += bedrag;
    cumVorig += vor ? vor.m[m - 1] : 0;
    maanden.push({
      maand: m,
      label: MAAND_KORT[m - 1],
      cumulatief: m <= tm ? Math.round(cum) : null,
      prognose: m >= tm && tm < 12 ? Math.round(huidig.realisatie + gemPerMaand * (m - tm)) : null,
      cumulatiefVorig: vor ? Math.round(cumVorig) : null,
      gedeclareerd: dit && m <= tm ? dit.a[m - 1] : null,
      toegewezen: dit && m <= tm ? dit.t[m - 1] : null,
      gedeclareerdVorig: vor ? vor.a[m - 1] : null,
      toegewezenVorig: vor ? vor.t[m - 1] : null,
    });
  }

  return {
    jaar,
    vorigJaar,
    tm,
    tmAutomatisch,
    huidig,
    vorig,
    groei: {
      realisatie: pct(huidig.realisatie, vorig.realisatie),
      actieveClienten: pct(huidig.actieveClienten, vorig.actieveClienten),
      kostenPerClient: pct(huidig.kostenPerClient, vorig.kostenPerClient),
    },
    perGemeente: gemeenten,
    maanden,
  };
}

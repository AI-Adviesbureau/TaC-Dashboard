import "server-only";
import { sql } from "./db";
import { addGemeenteFilter } from "./filter-sql";
import { ensureTrajectUniekView, TRAJECT_BRON } from "./schema";

export interface Filters {
  regio?: string | null;
  jaar?: number | null;
  maand?: number | null;
  van?: string | null; // custom periode (intake vanaf)
  tot?: string | null; // custom periode (intake t/m)
  gemeente?: string | string[] | null;
  code?: string | null;
  behandelaar?: string | null;
  rb?: string | null;
}

/** Bouwt een WHERE-clause + parameters voor sql.query(). */
function buildWhere(f: Filters, alias = "t", extraConds: string[] = []) {
  const parts: string[] = [...extraConds];
  const params: unknown[] = [];
  const add = (cond: (n: number) => string, val: unknown) => {
    params.push(val);
    parts.push(cond(params.length));
  };
  if (f.regio && f.regio !== "Totaal") add((n) => `${alias}.regio = $${n}`, f.regio);
  // Jaar = Excel-lijst (tabblad bron_jaar), niet intakejaar.
  if (f.jaar) add((n) => `${alias}.bron_jaar = $${n}`, f.jaar);
  if (f.maand) add((n) => `${alias}.maand_nr = $${n}`, f.maand);
  if (f.van) add((n) => `${alias}.intake >= $${n}`, f.van);
  if (f.tot) add((n) => `${alias}.intake <= $${n}`, f.tot);
  addGemeenteFilter(f.gemeente, alias, add);
  if (f.code) add((n) => `${alias}.code = $${n}`, f.code);
  if (f.behandelaar) add((n) => `${alias}.behandelaar_primair = $${n}`, f.behandelaar);
  if (f.rb) add((n) => `${alias}.rb = $${n}`, f.rb);
  const clause = parts.length ? "WHERE " + parts.join(" AND ") : "";
  return { clause, params };
}

interface KerncijfersRow {
  aantal: number;
  clienten: number;
  gem_dlt: number | null;
  med_dlt: number | null;
  inkoop: number;
  omzet: number; // beschikt budget (1x per traject)
  gerealiseerd: number; // som maandfacturatie
  overhead: number;
  betaald: number;
  openstaand: number;
  lopend: number;
}

async function kerncijfers(f: Filters): Promise<KerncijfersRow> {
  const { clause, params } = buildWhere(f);
  const text = `
    SELECT
      count(*)::int AS aantal,
      count(distinct rel_nr)::int AS clienten,
      avg(doorlooptijd) FILTER (WHERE doorlooptijd IS NOT NULL AND NOT lopend) AS gem_dlt,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY doorlooptijd)
        FILTER (WHERE doorlooptijd IS NOT NULL AND NOT lopend) AS med_dlt,
      coalesce(sum(inkoop), 0) AS inkoop,
      coalesce(sum(omzet), 0) AS omzet,
      coalesce(sum(realisatie), 0) AS gerealiseerd,
      coalesce(sum(overhead), 0) AS overhead,
      coalesce(sum(betaald_bedrag), 0) AS betaald,
      coalesce(sum(openstaand), 0) AS openstaand,
      count(*) FILTER (WHERE lopend)::int AS lopend
    FROM ${TRAJECT_BRON} t ${clause}`;
  const rows = (await sql.query(text, params)) as KerncijfersRow[];
  const r = rows[0];
  return {
    aantal: Number(r.aantal),
    clienten: Number(r.clienten),
    gem_dlt: r.gem_dlt === null ? null : Number(r.gem_dlt),
    med_dlt: r.med_dlt === null ? null : Number(r.med_dlt),
    inkoop: Number(r.inkoop),
    omzet: Number(r.omzet),
    gerealiseerd: Number(r.gerealiseerd),
    overhead: Number(r.overhead),
    betaald: Number(r.betaald),
    openstaand: Number(r.openstaand),
    lopend: Number(r.lopend),
  };
}

/**
 * Duurzame uitstroom: aandeel afgesloten trajecten waarbij de cliënt binnen
 * 12 maanden ná de einddatum geen nieuw traject start (geen heraanmelding).
 * Alleen trajecten waarvan het observatievenster van 12 mnd is verstreken
 * tellen mee (voorkomt vertekening door recente afsluitingen).
 */
async function duurzameUitstroom(
  f: Filters
): Promise<{ pct: number | null; totaal: number; duurzaam: number }> {
  const { clause, params } = buildWhere(f, "t", [
    "t.eind IS NOT NULL",
    "t.eind <= (CURRENT_DATE - INTERVAL '12 months')",
  ]);
  const text = `
    WITH afgesloten AS (
      SELECT t.rel_nr, t.eind FROM ${TRAJECT_BRON} t ${clause}
    )
    SELECT
      count(*)::int AS totaal,
      count(*) FILTER (WHERE NOT EXISTS (
        SELECT 1 FROM traject n
        WHERE n.rel_nr = a.rel_nr
          AND n.intake IS NOT NULL
          AND n.intake > a.eind
          AND n.intake <= a.eind + INTERVAL '12 months'
      ))::int AS duurzaam
    FROM afgesloten a`;
  const rows = (await sql.query(text, params)) as { totaal: number; duurzaam: number }[];
  const totaal = Number(rows[0].totaal);
  const duurzaam = Number(rows[0].duurzaam);
  return {
    totaal,
    duurzaam,
    pct: totaal > 0 ? Math.round((duurzaam / totaal) * 1000) / 10 : null,
  };
}

/** Budgetrealisatie: realisatie versus aangeleverd plafond. Plafonds zijn
 *  per jaar; daarom alleen zinvol als er één jaar is geselecteerd. */
async function budgetRealisatie(
  f: Filters
): Promise<{ realisatie: number; plafond: number | null; pct: number | null }> {
  const kc = await kerncijfers(f);
  // Zonder gekozen jaar geen plafondvergelijking (anders all-time omzet vs één jaarplafond).
  if (!f.jaar) {
    return { realisatie: kc.gerealiseerd, plafond: null, pct: null };
  }
  const params: unknown[] = [];
  const conds: string[] = [];
  if (f.jaar) {
    params.push(f.jaar);
    conds.push(`jaar = $${params.length}`);
  }
  if (f.regio && f.regio !== "Totaal") {
    params.push(f.regio);
    conds.push(`(regio = $${params.length} OR regio IS NULL)`);
  }
  addGemeenteFilter(f.gemeente, "", (cond, val) => {
    params.push(val);
    conds.push(cond(params.length));
  });
  const clause = conds.length ? "WHERE " + conds.join(" AND ") : "";
  const text = `SELECT coalesce(sum(plafond_bedrag), 0) AS plafond, count(*)::int AS n FROM budget_plafond ${clause}`;
  const rows = (await sql.query(text, params)) as { plafond: number; n: number }[];
  const heeftPlafond = Number(rows[0].n) > 0;
  const plafond = heeftPlafond ? Number(rows[0].plafond) : null;
  return {
    realisatie: kc.gerealiseerd,
    plafond,
    pct: plafond && plafond > 0 ? Math.round((kc.gerealiseerd / plafond) * 1000) / 10 : null,
  };
}

function pctVerschil(huidig: number | null, vorig: number | null): number | null {
  if (huidig === null || vorig === null || vorig === 0) return null;
  return Math.round(((huidig - vorig) / Math.abs(vorig)) * 1000) / 10;
}

export interface OverzichtData {
  kern: KerncijfersRow & { kostenPerClient: number | null; marge: number };
  uitstroom: { pct: number | null; totaal: number; duurzaam: number };
  budget: { realisatie: number; plafond: number | null; pct: number | null };
  trend: {
    doorlooptijd: number | null;
    kostenPerClient: number | null;
    omzet: number | null;
    aantal: number | null;
  } | null;
}

export async function getOverzicht(f: Filters): Promise<OverzichtData> {
  await ensureTrajectUniekView();
  const [kc, uit, bud] = await Promise.all([
    kerncijfers(f),
    duurzameUitstroom(f),
    budgetRealisatie(f),
  ]);
  const kostenPerClient = kc.clienten > 0 ? Math.round((kc.inkoop / kc.clienten) * 100) / 100 : null;
  // Marge op basis van werkelijk gefactureerde omzet minus inkoop en overhead.
  const marge = kc.gerealiseerd - kc.inkoop - kc.overhead;

  // Trend t.o.v. vorig jaar (alleen wanneer een jaar is gekozen).
  let trend: OverzichtData["trend"] = null;
  if (f.jaar) {
    const prev = await kerncijfers({ ...f, jaar: f.jaar - 1 });
    const prevKpc = prev.clienten > 0 ? prev.inkoop / prev.clienten : null;
    trend = {
      doorlooptijd: pctVerschil(kc.gem_dlt, prev.gem_dlt),
      kostenPerClient: pctVerschil(kostenPerClient, prevKpc),
      omzet: pctVerschil(kc.gerealiseerd, prev.gerealiseerd),
      aantal: pctVerschil(kc.aantal, prev.aantal),
    };
  }

  return { kern: { ...kc, kostenPerClient, marge }, uitstroom: uit, budget: bud, trend };
}

/** Trend van in- en uitstroom: per maand (binnen een jaar) of per jaar. */
export async function getTrend(
  f: Filters
): Promise<{ label: string; instroom: number; uitstroom: number; omzet: number }[]> {
  if (f.jaar) {
    // Per maand binnen de gekozen Excel-lijst (bron_jaar).
    const { clause, params } = buildWhere({ ...f, maand: null });
    const inText = `SELECT maand_nr AS m, count(*)::int AS n FROM ${TRAJECT_BRON} t ${clause} ${clause ? "AND" : "WHERE"} maand_nr IS NOT NULL GROUP BY maand_nr`;
    const omzetText = `SELECT maand_nr AS m, coalesce(sum(omzet),0) AS s FROM ${TRAJECT_BRON} t ${clause} ${clause ? "AND" : "WHERE"} maand_nr IS NOT NULL GROUP BY maand_nr`;
    const uitWhere = buildWhere({ ...f, maand: null }, "t", ["t.eind IS NOT NULL"]);
    const uitText = `SELECT EXTRACT(MONTH FROM t.eind)::int AS m, count(*)::int AS n FROM ${TRAJECT_BRON} t ${uitWhere.clause} GROUP BY 1`;
    const [inRows, uitRows, omzetRows] = await Promise.all([
      sql.query(inText, params) as unknown as Promise<{ m: number; n: number }[]>,
      sql.query(uitText, uitWhere.params) as unknown as Promise<{ m: number; n: number }[]>,
      sql.query(omzetText, params) as unknown as Promise<{ m: number; s: number }[]>,
    ]);
    const namen = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
    return namen.map((label, i) => ({
      label,
      instroom: Number(inRows.find((r) => Number(r.m) === i + 1)?.n ?? 0),
      uitstroom: Number(uitRows.find((r) => Number(r.m) === i + 1)?.n ?? 0),
      omzet: Number(omzetRows.find((r) => Number(r.m) === i + 1)?.s ?? 0),
    }));
  }

  // Per Excel-lijst (bron_jaar): instroom = rijen in lijst, uitstroom = afgesloten in lijst.
  const inWhere = buildWhere({ ...f, jaar: null });
  const inText = `SELECT bron_jaar AS j, count(*)::int AS n, coalesce(sum(omzet),0) AS omzet
    FROM ${TRAJECT_BRON} t ${inWhere.clause} GROUP BY bron_jaar`;
  const uitW = buildWhere({ ...f, jaar: null }, "t", ["t.eind IS NOT NULL"]);
  const uitText = `SELECT bron_jaar AS j, count(*)::int AS n
    FROM ${TRAJECT_BRON} t ${uitW.clause} GROUP BY bron_jaar`;
  const [inRows, uitRows] = await Promise.all([
    sql.query(inText, inWhere.params) as unknown as Promise<{ j: number; n: number; omzet: number }[]>,
    sql.query(uitText, uitW.params) as unknown as Promise<{ j: number; n: number }[]>,
  ]);
  const jaren = Array.from(
    new Set([...inRows.map((r) => Number(r.j)), ...uitRows.map((r) => Number(r.j))])
  )
    .filter((j) => j >= 2010 && j <= 2035)
    .sort((a, b) => a - b);
  return jaren.map((j) => ({
    label: String(j),
    instroom: Number(inRows.find((r) => Number(r.j) === j)?.n ?? 0),
    uitstroom: Number(uitRows.find((r) => Number(r.j) === j)?.n ?? 0),
    omzet: Number(inRows.find((r) => Number(r.j) === j)?.omzet ?? 0),
  }));
}

/** Verdeling per gemeente. */
export async function getPerGemeente(
  f: Filters
): Promise<{ gemeente: string; aantal: number; omzet: number; gem_dlt: number | null }[]> {
  const { clause, params } = buildWhere(f, "t", ["t.gemeente IS NOT NULL"]);
  const text = `
    SELECT gemeente,
      count(*)::int AS aantal,
      coalesce(sum(omzet),0) AS omzet,
      avg(doorlooptijd) FILTER (WHERE doorlooptijd IS NOT NULL AND NOT lopend) AS gem_dlt
    FROM ${TRAJECT_BRON} t ${clause}
    GROUP BY gemeente ORDER BY aantal DESC`;
  const rows = (await sql.query(text, params)) as Record<string, unknown>[];
  return rows.map((r) => ({
    gemeente: String(r.gemeente),
    aantal: Number(r.aantal),
    omzet: Number(r.omzet),
    gem_dlt: r.gem_dlt === null ? null : Number(r.gem_dlt),
  }));
}

export interface GemeentePrognoseRow {
  gemeente: string;
  aantal: number;
  lopend: number;
  aangevraagd: number;
  gedeclareerd: number;
  resterend: number;
  prognose: number;
  prognose_resterend: number;
}

/**
 * Budget per gemeente: aangevraagd (K+L), gedeclareerd (som maanden), resterend
 * en prognose op basis van het huidige maandtempo bij lopende trajecten.
 */
export async function getGemeentePrognose(f: Filters): Promise<GemeentePrognoseRow[]> {
  await ensureTrajectUniekView();
  const { clause, params } = buildWhere(f, "t", ["t.gemeente IS NOT NULL"]);
  const text = `
    SELECT gemeente,
      count(*)::int AS aantal,
      count(*) FILTER (WHERE lopend)::int AS lopend,
      coalesce(sum(omzet), 0) AS aangevraagd,
      coalesce(sum(realisatie), 0) AS gedeclareerd,
      coalesce(sum(omzet), 0) - coalesce(sum(realisatie), 0) AS resterend,
      coalesce(sum(
        CASE
          WHEN NOT lopend THEN realisatie
          WHEN omzet <= 0 AND realisatie > 0 THEN
            realisatie + GREATEST(
              COALESCE(NULLIF(periode, 0), 12) - COALESCE(doorlooptijd, 0),
              0
            ) * (realisatie / GREATEST(COALESCE(doorlooptijd, 1), 0.5))
          WHEN omzet <= 0 THEN realisatie
          WHEN doorlooptijd IS NULL OR doorlooptijd <= 0 THEN omzet
          ELSE LEAST(
            omzet,
            realisatie + GREATEST(
              COALESCE(NULLIF(periode, 0), doorlooptijd, 12) - doorlooptijd,
              0
            ) * (realisatie / GREATEST(doorlooptijd, 0.5))
          )
        END
      ), 0) AS prognose
    FROM ${TRAJECT_BRON} t ${clause}
    GROUP BY gemeente
    ORDER BY aangevraagd DESC, gemeente`;
  const rows = (await sql.query(text, params)) as Record<string, unknown>[];
  return rows.map((r) => {
    const aangevraagd = Number(r.aangevraagd);
    const prognose = Number(r.prognose);
    return {
      gemeente: String(r.gemeente),
      aantal: Number(r.aantal),
      lopend: Number(r.lopend),
      aangevraagd,
      gedeclareerd: Number(r.gedeclareerd),
      resterend: Number(r.resterend),
      prognose,
      prognose_resterend: aangevraagd - prognose,
    };
  });
}

/** Verdeling per productcode (top N). */
export async function getPerCode(
  f: Filters,
  limit = 10
): Promise<{ code: string; aantal: number; omzet: number }[]> {
  const { clause, params } = buildWhere(f, "t", ["t.code IS NOT NULL"]);
  params.push(limit);
  const text = `
    SELECT code, count(*)::int AS aantal, coalesce(sum(omzet),0) AS omzet
    FROM ${TRAJECT_BRON} t ${clause}
    GROUP BY code ORDER BY aantal DESC LIMIT $${params.length}`;
  const rows = (await sql.query(text, params)) as Record<string, unknown>[];
  return rows.map((r) => ({ code: String(r.code), aantal: Number(r.aantal), omzet: Number(r.omzet) }));
}

/** Histogram van doorlooptijd (in maandbuckets). */
export async function getDoorlooptijdVerdeling(
  f: Filters
): Promise<{ bucket: string; aantal: number }[]> {
  const { clause, params } = buildWhere(f, "t", [
    "t.doorlooptijd IS NOT NULL",
    "NOT t.lopend",
  ]);
  const text = `
    SELECT width_bucket(doorlooptijd, 0, 24, 12) AS b, count(*)::int AS aantal
    FROM ${TRAJECT_BRON} t ${clause}
    GROUP BY b ORDER BY b`;
  const rows = (await sql.query(text, params)) as { b: number; aantal: number }[];
  const labels: Record<number, string> = {};
  for (let i = 1; i <= 12; i++) labels[i] = `${(i - 1) * 2}-${i * 2}`;
  const out: { bucket: string; aantal: number }[] = [];
  for (let i = 1; i <= 12; i++) {
    out.push({ bucket: labels[i], aantal: Number(rows.find((r) => Number(r.b) === i)?.aantal ?? 0) });
  }
  const over = rows.find((r) => Number(r.b) === 13);
  out.push({ bucket: "24+", aantal: Number(over?.aantal ?? 0) });
  return out;
}

/** Doorsnede per behandelaar of regiebehandelaar. */
export async function getPerBehandelaar(
  f: Filters,
  rol: "behandelaar" | "rb" = "behandelaar"
): Promise<
  {
    behandelaar: string;
    aantal: number;
    clienten: number;
    gem_dlt: number | null;
    inkoop: number;
    omzet: number;
  }[]
> {
  const kolom = rol === "rb" ? "rb" : "behandelaar_primair";
  const { clause, params } = buildWhere(f, "t", [`t.${kolom} IS NOT NULL`]);
  const text = `
    SELECT ${kolom} AS behandelaar,
      count(*)::int AS aantal,
      count(distinct rel_nr)::int AS clienten,
      avg(doorlooptijd) FILTER (WHERE doorlooptijd IS NOT NULL AND NOT lopend) AS gem_dlt,
      coalesce(sum(inkoop),0) AS inkoop,
      coalesce(sum(omzet),0) AS omzet
    FROM ${TRAJECT_BRON} t ${clause}
    GROUP BY ${kolom} ORDER BY aantal DESC`;
  const rows = (await sql.query(text, params)) as Record<string, unknown>[];
  return rows.map((r) => ({
    behandelaar: String(r.behandelaar),
    aantal: Number(r.aantal),
    clienten: Number(r.clienten),
    gem_dlt: r.gem_dlt === null ? null : Number(r.gem_dlt),
    inkoop: Number(r.inkoop),
    omzet: Number(r.omzet),
  }));
}

/** Beschikbare filteropties (gemeenten, codes, behandelaren). */
export async function getFilterOpties(
  regio?: string | null,
  jaar?: number | null
): Promise<{
  gemeenten: string[];
  codes: string[];
  behandelaren: string[];
}> {
  const g =
    jaar != null
      ? regio && regio !== "Totaal"
        ? ((await sql`
            SELECT DISTINCT gemeente FROM traject
            WHERE gemeente IS NOT NULL AND bron_jaar = ${jaar} AND regio = ${regio}
            ORDER BY gemeente
          `) as { gemeente: string }[])
        : ((await sql`
            SELECT DISTINCT gemeente FROM traject
            WHERE gemeente IS NOT NULL AND bron_jaar = ${jaar}
            ORDER BY gemeente
          `) as { gemeente: string }[])
      : regio && regio !== "Totaal"
        ? ((await sql`SELECT DISTINCT gemeente FROM traject WHERE gemeente IS NOT NULL AND regio = ${regio} ORDER BY gemeente`) as {
            gemeente: string;
          }[])
        : ((await sql`SELECT DISTINCT gemeente FROM traject WHERE gemeente IS NOT NULL ORDER BY gemeente`) as {
            gemeente: string;
          }[]);
  const codeQuery =
    jaar != null
      ? sql`SELECT DISTINCT code FROM traject WHERE code IS NOT NULL AND bron_jaar = ${jaar} ORDER BY code`
      : sql`SELECT DISTINCT code FROM traject WHERE code IS NOT NULL ORDER BY code`;
  const behQuery =
    jaar != null
      ? sql`SELECT DISTINCT behandelaar_primair FROM traject WHERE behandelaar_primair IS NOT NULL AND bron_jaar = ${jaar} ORDER BY behandelaar_primair`
      : sql`SELECT DISTINCT behandelaar_primair FROM traject WHERE behandelaar_primair IS NOT NULL ORDER BY behandelaar_primair`;
  const [c, b] = await Promise.all([
    codeQuery as unknown as Promise<{ code: string }[]>,
    behQuery as unknown as Promise<{ behandelaar_primair: string }[]>,
  ]);
  return {
    gemeenten: g.map((r) => r.gemeente),
    codes: c.map((r) => r.code),
    behandelaren: b.map((r) => r.behandelaar_primair),
  };
}

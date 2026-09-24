// Geen "server-only": ook bruikbaar vanuit scripts. Bevat geen geheimen.
import { sql } from "./db";
import { addGemeenteFilter } from "./filter-sql";

/**
 * Budgetbasis voor "verbruik":
 * - "incl": toegekend budget incl. afwijking/speling (de lijst van Anniek);
 * - "basis": basisbudget excl. speling — de noemer die het gemeentedashboard
 *   (Jeugdmonitor) gebruikt voor het verbruikspercentage.
 */
export type BudgetBasis = "incl" | "basis";

export function budgetKolom(basis: BudgetBasis | null | undefined): "plafond_bedrag" | "basis_bedrag" {
  return basis === "basis" ? "basis_bedrag" : "plafond_bedrag";
}

/** Zorgt dat de kolom basis_bedrag bestaat (idempotent, goedkoop). */
let kolomKlaar: Promise<void> | null = null;
export async function ensureBudgetKolom() {
  if (!kolomKlaar) {
    kolomKlaar = (async () => {
      await sql`ALTER TABLE IF EXISTS budget_plafond ADD COLUMN IF NOT EXISTS basis_bedrag NUMERIC`;
    })().catch((e) => {
      kolomKlaar = null;
      throw e;
    });
  }
  await kolomKlaar;
}

export interface PlafondSelectie {
  jaar: number;
  regio?: string | null;
  gemeente?: string | string[] | null;
  basis?: BudgetBasis | null;
}

export interface PlafondResultaat {
  /** Totaal voor de selectie, of null als (nog) niet bekend. */
  bedrag: number | null;
  /** Aantal gemeenten in de selectie zónder bedrag (alleen relevant bij per-gemeente rijen). */
  ontbrekend: number;
  /** Bron van het totaal: per gemeente opgeteld, of een regio-/totaalrij. */
  bron: "gemeenten" | "regio" | "geen";
}

/**
 * Totaal plafond voor een selectie.
 * Voorkeur: gemeente-rijen optellen (alle rijen die bij de selectie horen).
 * Als daar geen (volledige) waarde is en er geen gemeentefilter actief is,
 * val terug op een regio-/totaalrij (gemeente IS NULL). Nooit beide optellen.
 */
export async function plafondTotaal(sel: PlafondSelectie): Promise<PlafondResultaat> {
  await ensureBudgetKolom();
  const kolom = budgetKolom(sel.basis);
  const gemeenteFilterActief = Array.isArray(sel.gemeente) ? sel.gemeente.length > 0 : !!sel.gemeente;

  // 1) Gemeente-rijen
  const p1: unknown[] = [sel.jaar];
  const c1 = ["jaar = $1", "gemeente IS NOT NULL"];
  if (sel.regio && sel.regio !== "Totaal") {
    p1.push(sel.regio);
    c1.push(`regio = $${p1.length}`);
  }
  addGemeenteFilter(sel.gemeente, "", (cond, val) => {
    p1.push(val);
    c1.push(cond(p1.length));
  });
  const g = (await sql.query(
    `SELECT count(*)::int AS n, count(${kolom})::int AS met, coalesce(sum(${kolom}),0) AS som
     FROM budget_plafond WHERE ${c1.join(" AND ")}`,
    p1
  )) as { n: number; met: number; som: number }[];
  const n = Number(g[0].n);
  const met = Number(g[0].met);
  if (n > 0 && met === n) return { bedrag: Number(g[0].som), ontbrekend: 0, bron: "gemeenten" };

  // 2) Regio-/totaalrij (alleen zonder gemeentefilter)
  if (!gemeenteFilterActief) {
    const p2: unknown[] = [sel.jaar];
    const c2 = ["jaar = $1", "gemeente IS NULL"];
    if (sel.regio && sel.regio !== "Totaal") {
      p2.push(sel.regio);
      c2.push(`(regio = $${p2.length} OR regio IS NULL)`);
    }
    const r = (await sql.query(
      `SELECT count(${kolom})::int AS met, coalesce(sum(${kolom}),0) AS som
       FROM budget_plafond WHERE ${c2.join(" AND ")}`,
      p2
    )) as { met: number; som: number }[];
    if (Number(r[0].met) > 0) return { bedrag: Number(r[0].som), ontbrekend: n - met, bron: "regio" };
  }

  // 3) Deels gevuld: geen betrouwbaar totaal
  return { bedrag: null, ontbrekend: n - met, bron: "geen" };
}

/** Plafond per gemeente (jaar), in de gekozen basis; null als niet ingevuld. */
export async function plafondPerGemeente(
  jaar: number,
  basis: BudgetBasis | null | undefined
): Promise<Map<string, number | null>> {
  await ensureBudgetKolom();
  const kolom = budgetKolom(basis);
  const rows = (await sql.query(
    `SELECT gemeente, sum(${kolom}) AS bedrag FROM budget_plafond
     WHERE jaar = $1 AND gemeente IS NOT NULL GROUP BY gemeente`,
    [jaar]
  )) as { gemeente: string; bedrag: number | null }[];
  const m = new Map<string, number | null>();
  for (const r of rows) m.set(r.gemeente, r.bedrag === null ? null : Number(r.bedrag));
  return m;
}

/** Gemeente-filter: enkelvoud of meervoud (IN / ANY). */
export function addGemeenteFilter(
  gemeente: string | string[] | null | undefined,
  alias: string,
  add: (cond: (n: number) => string, val: unknown) => void
) {
  if (!gemeente) return;
  const list = (Array.isArray(gemeente) ? gemeente : [gemeente]).filter(Boolean);
  if (list.length === 0) return;
  if (list.length === 1) {
    add((n) => `${alias}.gemeente = $${n}`, list[0]);
  } else {
    add((n) => `${alias}.gemeente = ANY($${n}::text[])`, list);
  }
}

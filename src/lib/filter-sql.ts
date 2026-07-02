/** Gemeente-filter: enkelvoud of meervoud (IN / ANY). */
export function addGemeenteFilter(
  gemeente: string | string[] | null | undefined,
  alias: string,
  add: (cond: (n: number) => string, val: unknown) => void
) {
  if (!gemeente) return;
  const list = (Array.isArray(gemeente) ? gemeente : [gemeente]).filter(Boolean);
  if (list.length === 0) return;
  const prefix = alias ? `${alias}.` : "";
  if (list.length === 1) {
    add((n) => `${prefix}gemeente = $${n}`, list[0]);
  } else {
    add((n) => `${prefix}gemeente = ANY($${n}::text[])`, list);
  }
}

"use client";

import { useEffect, useState } from "react";
import { useFilters } from "@/components/filters/filter-context";
import { filtersToQuery } from "@/lib/types";

/**
 * Haalt data op van een API-route en herlaadt automatisch wanneer de
 * globale filters wijzigen.
 */
export function useApi<T>(
  path: string,
  extra?: Record<string, string | number | null | undefined>
) {
  const f = useFilters();
  const qs = filtersToQuery(f, extra);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    // Bewust: zet laad-status bij start van het ophalen (synchronisatie met fetch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    fetch(path + qs, { signal: ac.signal })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error || `Fout ${r.status}`);
        }
        return r.json();
      })
      .then((d: T) => {
        setData(d);
        setLoading(false);
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => ac.abort();
  }, [path, qs]);

  return { data, loading, error };
}

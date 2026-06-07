"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { GlobalFilters, RegioFilter } from "@/lib/types";

interface FilterCtx extends GlobalFilters {
  setRegio: (r: RegioFilter) => void;
  setJaar: (j: number | null) => void;
  setMaand: (m: number | null) => void;
  setRange: (van: string | null, tot: string | null) => void;
  reset: () => void;
}

const Ctx = createContext<FilterCtx | null>(null);

/**
 * Globale filterstatus. Bewust NIET opgeslagen in URL of storage:
 * bij een browser-refresh start de periode (datum) weer leeg — zoals gewenst.
 * Jaar/maand en een custom datumrange sluiten elkaar uit.
 */
export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [regio, setRegio] = useState<RegioFilter>("Totaal");
  const [jaar, setJaar] = useState<number | null>(null);
  const [maand, setMaand] = useState<number | null>(null);
  const [van, setVan] = useState<string | null>(null);
  const [tot, setTot] = useState<string | null>(null);

  const value = useMemo<FilterCtx>(
    () => ({
      regio,
      jaar,
      maand,
      van,
      tot,
      setRegio,
      setJaar: (j) => {
        setJaar(j);
        setVan(null);
        setTot(null);
        if (j === null) setMaand(null);
      },
      setMaand,
      setRange: (v, t) => {
        setVan(v);
        setTot(t);
        if (v || t) {
          setJaar(null);
          setMaand(null);
        }
      },
      reset: () => {
        setRegio("Totaal");
        setJaar(null);
        setMaand(null);
        setVan(null);
        setTot(null);
      },
    }),
    [regio, jaar, maand, van, tot]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFilters(): FilterCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useFilters moet binnen FilterProvider gebruikt worden.");
  return c;
}

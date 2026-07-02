"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type OverviewFilterCtx = {
  gemeenten: string[];
  toggleGemeente: (g: string) => void;
  clearGemeenten: () => void;
  setGemeenten: (g: string[]) => void;
};

const Ctx = createContext<OverviewFilterCtx | null>(null);

export function OverviewFilterProvider({ children }: { children: React.ReactNode }) {
  const [gemeenten, setGemeenten] = useState<string[]>([]);

  const toggleGemeente = useCallback((g: string) => {
    setGemeenten((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  }, []);

  const clearGemeenten = useCallback(() => setGemeenten([]), []);

  const value = useMemo(
    () => ({ gemeenten, toggleGemeente, clearGemeenten, setGemeenten }),
    [gemeenten, toggleGemeente, clearGemeenten]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOverviewFilters() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOverviewFilters buiten OverviewFilterProvider");
  return ctx;
}

/** Veilige variant voor topbar (geen throw buiten provider). */
export function useOverviewFiltersOptional() {
  return useContext(Ctx);
}

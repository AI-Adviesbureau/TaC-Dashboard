"use client";

import { useState } from "react";
import { Target, Tag, UserCog, KeyRound } from "lucide-react";
import { cn } from "@/lib/cn";
import { PlafondsTab } from "./plafonds-tab";
import { CodesTab } from "./codes-tab";
import { BehandelarenTab } from "./behandelaren-tab";
import { AccountTab } from "./account-tab";

const TABS = [
  { key: "plafonds", label: "Budgetplafonds", icon: Target },
  { key: "codes", label: "Productcodes", icon: Tag },
  { key: "behandelaren", label: "Behandelaren", icon: UserCog },
  { key: "account", label: "Account", icon: KeyRound },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function BeheerPage() {
  const [tab, setTab] = useState<TabKey>("plafonds");

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition",
                active
                  ? "border-transparent bg-[var(--brand-green)] text-white shadow-sm"
                  : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--brand-green)]"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="animate-in">
        {tab === "plafonds" && <PlafondsTab />}
        {tab === "codes" && <CodesTab />}
        {tab === "behandelaren" && <BehandelarenTab />}
        {tab === "account" && <AccountTab />}
      </div>
    </div>
  );
}

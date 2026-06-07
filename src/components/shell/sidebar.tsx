"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { MODULES } from "@/lib/config/modules";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/cn";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Inklap-voorkeur onthouden (los van de datum die juist wél reset bij refresh).
  useEffect(() => {
    if (localStorage.getItem("tac_sidebar_collapsed") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(true);
    }
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("tac_sidebar_collapsed", next ? "1" : "0");
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r bg-[var(--surface)] transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:flex",
        collapsed ? "w-[76px]" : "w-[248px]"
      )}
    >
      <div className="flex h-16 items-center justify-between px-4">
        <div className={cn("overflow-hidden transition-all", collapsed && "w-0 opacity-0")}>
          <Logo />
        </div>
        {collapsed && (
          <div className="mx-auto">
            <Logo compact />
          </div>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-3">
        {MODULES.map((m) => {
          const active = pathname === m.href || pathname.startsWith(m.href + "/");
          const Icon = m.icon;
          return (
            <Link
              key={m.href}
              href={m.href}
              title={collapsed ? m.label : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
                active
                  ? "bg-[var(--brand-green-50)] text-[var(--brand-green-700)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              )}
            >
              <span
                className={cn(
                  "absolute left-0 top-1/2 h-6 -translate-y-1/2 rounded-r-full bg-[var(--brand-green)] transition-all",
                  active ? "w-1" : "w-0"
                )}
              />
              <Icon className={cn("h-5 w-5 shrink-0", active && "text-[var(--brand-green)]")} />
              <span
                className={cn(
                  "whitespace-nowrap transition-all",
                  collapsed && "w-0 overflow-hidden opacity-0"
                )}
              >
                {m.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3">
        <button
          onClick={toggle}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
          title={collapsed ? "Menu uitklappen" : "Menu inklappen"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5 shrink-0" />
          ) : (
            <PanelLeftClose className="h-5 w-5 shrink-0" />
          )}
          <span className={cn("whitespace-nowrap transition-all", collapsed && "w-0 overflow-hidden opacity-0")}>
            Inklappen
          </span>
        </button>
      </div>
    </aside>
  );
}

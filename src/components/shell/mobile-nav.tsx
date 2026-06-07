"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULES } from "@/lib/config/modules";
import { cn } from "@/lib/cn";

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-[var(--surface)]/95 backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {MODULES.map((m) => {
          const active = pathname.startsWith(m.href);
          const Icon = m.icon;
          return (
            <Link
              key={m.href}
              href={m.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition",
                active ? "text-[var(--brand-green-700)]" : "text-[var(--muted)]"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "text-[var(--brand-green)]")} />
              {m.label.split(" ")[0]}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

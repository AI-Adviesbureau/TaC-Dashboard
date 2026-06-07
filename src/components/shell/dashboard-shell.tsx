"use client";

import { FilterProvider } from "@/components/filters/filter-context";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";

export function DashboardShell({
  naam,
  children,
}: {
  naam: string | null;
  children: React.ReactNode;
}) {
  return (
    <FilterProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar naam={naam} />
          <main className="flex-1 px-4 pb-24 pt-5 md:px-6 md:pb-10">{children}</main>
          <MobileNav />
        </div>
      </div>
    </FilterProvider>
  );
}

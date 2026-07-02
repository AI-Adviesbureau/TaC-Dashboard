"use client";

import { usePathname } from "next/navigation";
import { FilterProvider, useFilters } from "@/components/filters/filter-context";
import { OverviewFilterProvider } from "@/components/filters/overview-filter-context";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";

function DashboardBody({
  naam,
  children,
}: {
  naam: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { regio } = useFilters();

  const body = (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar naam={naam} />
        <main className="flex-1 px-4 pb-24 pt-5 md:px-6 md:pb-10">{children}</main>
        <MobileNav />
      </div>
    </div>
  );

  if (pathname.startsWith("/overzicht")) {
    return <OverviewFilterProvider key={regio}>{body}</OverviewFilterProvider>;
  }
  return body;
}

export function DashboardShell({
  naam,
  children,
}: {
  naam: string | null;
  children: React.ReactNode;
}) {
  return (
    <FilterProvider>
      <DashboardBody naam={naam}>{children}</DashboardBody>
    </FilterProvider>
  );
}

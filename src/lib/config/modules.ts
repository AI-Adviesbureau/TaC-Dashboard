import {
  LayoutDashboard,
  ListChecks,
  Wallet,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface ModuleDef {
  href: string;
  label: string;
  icon: LucideIcon;
  beschrijving: string;
}

/**
 * Centrale moduleregistratie. Een nieuwe module toevoegen =
 * een route aanmaken + hier één regel toevoegen.
 */
export const MODULES: ModuleDef[] = [
  {
    href: "/overzicht",
    label: "Overzicht",
    icon: LayoutDashboard,
    beschrijving: "KPI's en trends in één oogopslag",
  },
  {
    href: "/trajecten",
    label: "Trajecten",
    icon: ListChecks,
    beschrijving: "Doorzoekbaar overzicht per traject",
  },
  {
    href: "/kosten",
    label: "Kosten & budget",
    icon: Wallet,
    beschrijving: "Kosten per cliënt, marge en budgetrealisatie",
  },
  {
    href: "/behandelaren",
    label: "Behandelaren",
    icon: Users,
    beschrijving: "Doorsnede per (regie)behandelaar",
  },
  {
    href: "/beheer",
    label: "Beheer",
    icon: Settings,
    beschrijving: "Budgetplafonds, codes, namen en account",
  },
];

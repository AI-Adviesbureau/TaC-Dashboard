import { NextRequest, NextResponse } from "next/server";
import { guard } from "../_guard";
import { parseFilters } from "@/lib/api-filters";
import { getPerGemeente, getPerCode, getDoorlooptijdVerdeling, getGemeentePrognose } from "@/lib/kpi";
import { ensureTrajectUniekView } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const blocked = await guard();
  if (blocked) return blocked;
  await ensureTrajectUniekView();
  const f = parseFilters(new URL(req.url));
  const [gemeente, code, doorlooptijd, prognose] = await Promise.all([
    getPerGemeente(f),
    getPerCode(f),
    getDoorlooptijdVerdeling(f),
    getGemeentePrognose(f),
  ]);
  return NextResponse.json({ gemeente, code, doorlooptijd, prognose });
}

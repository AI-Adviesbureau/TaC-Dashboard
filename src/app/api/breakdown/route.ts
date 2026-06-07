import { NextRequest, NextResponse } from "next/server";
import { guard } from "../_guard";
import { parseFilters } from "@/lib/api-filters";
import { getPerGemeente, getPerCode, getDoorlooptijdVerdeling } from "@/lib/kpi";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const blocked = await guard();
  if (blocked) return blocked;
  const f = parseFilters(new URL(req.url));
  const [gemeente, code, doorlooptijd] = await Promise.all([
    getPerGemeente(f),
    getPerCode(f),
    getDoorlooptijdVerdeling(f),
  ]);
  return NextResponse.json({ gemeente, code, doorlooptijd });
}

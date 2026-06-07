import { NextRequest, NextResponse } from "next/server";
import { guard } from "../_guard";
import { parseFilters } from "@/lib/api-filters";
import { getTrajecten } from "@/lib/trajecten";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const blocked = await guard();
  if (blocked) return blocked;
  const url = new URL(req.url);
  const p = url.searchParams;
  const filters = {
    ...parseFilters(url),
    lopend: p.get("lopend") || null,
    betaald: p.get("betaald") || null,
  };
  const data = await getTrajecten(filters, {
    search: p.get("q") ?? undefined,
    sort: p.get("sort") ?? undefined,
    dir: p.get("dir") ?? undefined,
    limit: p.get("limit") ? parseInt(p.get("limit")!, 10) : undefined,
    offset: p.get("offset") ? parseInt(p.get("offset")!, 10) : undefined,
  });
  return NextResponse.json(data);
}

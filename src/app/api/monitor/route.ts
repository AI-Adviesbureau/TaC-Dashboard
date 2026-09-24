import { NextRequest, NextResponse } from "next/server";
import { guard } from "../_guard";
import { parseFilters } from "@/lib/api-filters";
import { getMonitor } from "@/lib/monitor";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const blocked = await guard();
  if (blocked) return blocked;
  const data = await getMonitor(parseFilters(new URL(req.url)));
  return NextResponse.json(data);
}

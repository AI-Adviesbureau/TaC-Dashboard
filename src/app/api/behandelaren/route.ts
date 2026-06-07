import { NextRequest, NextResponse } from "next/server";
import { guard } from "../_guard";
import { parseFilters } from "@/lib/api-filters";
import { getPerBehandelaar } from "@/lib/kpi";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const blocked = await guard();
  if (blocked) return blocked;
  const url = new URL(req.url);
  const rol = url.searchParams.get("rol") === "rb" ? "rb" : "behandelaar";
  const data = await getPerBehandelaar(parseFilters(url), rol);
  return NextResponse.json(data);
}

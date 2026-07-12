import { NextRequest, NextResponse } from "next/server";
import { guard } from "../_guard";
import { getFilterOpties } from "@/lib/kpi";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const blocked = await guard();
  if (blocked) return blocked;
  const regio = req.nextUrl.searchParams.get("regio");
  const jaarParam = req.nextUrl.searchParams.get("jaar");
  const jaar = jaarParam ? Number(jaarParam) : null;
  const data = await getFilterOpties(regio, Number.isFinite(jaar) ? jaar : null);
  return NextResponse.json(data);
}

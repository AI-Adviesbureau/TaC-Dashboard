import { NextResponse } from "next/server";
import { guard } from "../_guard";
import { getFilterOpties } from "@/lib/kpi";

export const dynamic = "force-dynamic";

export async function GET() {
  const blocked = await guard();
  if (blocked) return blocked;
  const data = await getFilterOpties();
  return NextResponse.json(data);
}

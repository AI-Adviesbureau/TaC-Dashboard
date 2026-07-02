import { NextResponse } from "next/server";
import { guard } from "../../_guard";
import { wipeData } from "@/lib/ingest-core";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const blocked = await guard();
  if (blocked) return blocked;
  await wipeData();
  return NextResponse.json({ ok: true });
}

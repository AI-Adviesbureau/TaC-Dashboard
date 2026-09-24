import { NextRequest, NextResponse } from "next/server";
import { guard } from "../../_guard";
import { listCodes, upsertCode, upsertZorgvorm } from "@/lib/beheer";

export const dynamic = "force-dynamic";

export async function GET() {
  const blocked = await guard();
  if (blocked) return blocked;
  return NextResponse.json(await listCodes());
}

export async function PUT(req: NextRequest) {
  const blocked = await guard();
  if (blocked) return blocked;
  const b = await req.json().catch(() => ({}));
  if (!b.code) return NextResponse.json({ error: "code ontbreekt." }, { status: 400 });
  if ("zorgvorm" in b) await upsertZorgvorm(String(b.code), b.zorgvorm ?? null);
  if ("omschrijving" in b) await upsertCode(String(b.code), b.omschrijving ?? null);
  return NextResponse.json({ ok: true });
}

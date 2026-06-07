import { NextRequest, NextResponse } from "next/server";
import { guard } from "../../_guard";
import { listBehandelaarNamen, upsertBehandelaar } from "@/lib/beheer";

export const dynamic = "force-dynamic";

export async function GET() {
  const blocked = await guard();
  if (blocked) return blocked;
  return NextResponse.json(await listBehandelaarNamen());
}

export async function PUT(req: NextRequest) {
  const blocked = await guard();
  if (blocked) return blocked;
  const b = await req.json().catch(() => ({}));
  if (!b.initialen) return NextResponse.json({ error: "initialen ontbreekt." }, { status: 400 });
  await upsertBehandelaar(String(b.initialen), b.naam ?? null);
  return NextResponse.json({ ok: true });
}

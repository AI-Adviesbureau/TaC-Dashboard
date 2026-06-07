import { NextRequest, NextResponse } from "next/server";
import { guard } from "../../_guard";
import { listPlafonds, addPlafond, deletePlafond } from "@/lib/beheer";

export const dynamic = "force-dynamic";

export async function GET() {
  const blocked = await guard();
  if (blocked) return blocked;
  return NextResponse.json(await listPlafonds());
}

export async function POST(req: NextRequest) {
  const blocked = await guard();
  if (blocked) return blocked;
  const b = await req.json().catch(() => ({}));
  const jaar = parseInt(b.jaar, 10);
  if (!jaar || jaar < 2000 || jaar > 2100) {
    return NextResponse.json({ error: "Geldig jaar is verplicht." }, { status: 400 });
  }
  await addPlafond({
    jaar,
    regio: b.regio || null,
    gemeente: b.gemeente || null,
    plafond_bedrag: b.plafond_bedrag != null && b.plafond_bedrag !== "" ? Number(b.plafond_bedrag) : null,
    plekken: b.plekken != null && b.plekken !== "" ? parseInt(b.plekken, 10) : null,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const blocked = await guard();
  if (blocked) return blocked;
  const id = parseInt(new URL(req.url).searchParams.get("id") || "", 10);
  if (!id) return NextResponse.json({ error: "id ontbreekt." }, { status: 400 });
  await deletePlafond(id);
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { guard } from "../../_guard";
import { ingestWorkbook, getDataStatus, setLastUpload } from "@/lib/ingest-core";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

export async function GET() {
  const blocked = await guard();
  if (blocked) return blocked;
  return NextResponse.json(await getDataStatus());
}

export async function POST(req: NextRequest) {
  const blocked = await guard();
  if (blocked) return blocked;

  let file: File;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (!(f instanceof File)) {
      return NextResponse.json({ error: "Geen bestand ontvangen." }, { status: 400 });
    }
    file = f;
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  if (!/\.(xlsx|xls)$/i.test(file.name)) {
    return NextResponse.json(
      { error: "Alleen Excel-bestanden (.xlsx of .xls) zijn toegestaan." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Bestand is te groot (max 20 MB)." }, { status: 400 });
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer", cellDates: true });
    const summary = await ingestWorkbook(wb);
    await setLastUpload(new Date().toISOString(), file.name);
    // Het geüploade bestand wordt nergens bewaard (alleen in geheugen verwerkt).
    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Verwerken mislukt.";
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}

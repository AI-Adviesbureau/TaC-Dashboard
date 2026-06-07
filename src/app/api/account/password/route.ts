import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const huidig = String(b.huidig || "");
  const nieuw = String(b.nieuw || "");

  if (nieuw.length < 8) {
    return NextResponse.json(
      { error: "Nieuw wachtwoord moet minstens 8 tekens zijn." },
      { status: 400 }
    );
  }

  const rows = (await sql`
    SELECT password_hash FROM app_user WHERE id = ${session.uid} LIMIT 1
  `) as { password_hash: string }[];
  if (!rows[0]) return NextResponse.json({ error: "Account niet gevonden." }, { status: 404 });

  const ok = await bcrypt.compare(huidig, rows[0].password_hash);
  if (!ok) {
    return NextResponse.json({ error: "Huidig wachtwoord klopt niet." }, { status: 400 });
  }

  const hash = await bcrypt.hash(nieuw, 10);
  await sql`UPDATE app_user SET password_hash = ${hash} WHERE id = ${session.uid}`;
  return NextResponse.json({ ok: true });
}

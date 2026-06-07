import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { rateLimit, rateLimitReset } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Rate limiting per IP: max 8 pogingen per 15 minuten.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "onbekend";
  const rl = rateLimit(`login:${ip}`, { limit: 8, windowMs: 15 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Te veel inlogpogingen. Probeer over ${Math.ceil(rl.retryAfterSec / 60)} min opnieuw.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let email = "";
  let password = "";
  try {
    const body = await req.json();
    email = String(body.email || "").trim().toLowerCase();
    password = String(body.password || "");
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  if (!email || !password) {
    return NextResponse.json({ error: "Vul e-mail en wachtwoord in." }, { status: 400 });
  }

  const rows = (await sql`
    SELECT id, email, password_hash, naam FROM app_user WHERE email = ${email} LIMIT 1
  `) as { id: number; email: string; password_hash: string; naam: string | null }[];

  const user = rows[0];
  // Vergelijk altijd (ook bij onbekend account) tegen een dummy om timing te egaliseren.
  const hash = user?.password_hash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
  const ok = await bcrypt.compare(password, hash);

  if (!user || !ok) {
    return NextResponse.json({ error: "Onjuiste e-mail of wachtwoord." }, { status: 401 });
  }

  rateLimitReset(`login:${ip}`);
  await createSession({ uid: user.id, email: user.email, naam: user.naam });
  return NextResponse.json({ ok: true });
}

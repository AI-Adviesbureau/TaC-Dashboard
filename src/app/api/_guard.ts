import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

/** Geeft null terug als ingelogd, anders een 401-respons. */
export async function guard(): Promise<NextResponse | null> {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  return null;
}

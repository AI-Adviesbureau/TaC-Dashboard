import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "tac_session";

/** Routes die zonder login bereikbaar zijn. */
const PUBLIC_PATHS = ["/login"];

async function isValid(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const s = process.env.AUTH_SECRET;
  if (!s) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(s));
    return true;
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE)?.value;
  const valid = await isValid(token);
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // Ingelogd maar op de loginpagina → door naar dashboard.
  if (valid && isPublic) {
    return NextResponse.redirect(new URL("/overzicht", req.url));
  }
  // Niet ingelogd en op een beschermde pagina → naar login.
  if (!valid && !isPublic) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Alles behalve API-routes (die regelen hun eigen auth) en statische assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};

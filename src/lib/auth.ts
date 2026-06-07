import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE = "tac_session";
const MAX_AGE = 60 * 60 * 8; // 8 uur

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET ontbreekt in de omgeving.");
  return new TextEncoder().encode(s);
}

export interface SessionPayload {
  uid: number;
  email: string;
  naam: string | null;
}

/** Maakt een ondertekend sessietoken en zet het als httpOnly-cookie. */
export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

/** Verwijdert de sessie (uitloggen). */
export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

/** Leest en valideert de huidige sessie; null als niet ingelogd. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      uid: payload.uid as number,
      email: payload.email as string,
      naam: (payload.naam as string) ?? null,
    };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = COOKIE;

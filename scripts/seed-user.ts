/**
 * Maakt of werkt gebruikers bij voor het loginscherm.
 *
 *   npm run db:seed                      → seedt de standaardaccounts
 *   npm run db:seed -- email wachtwoord "Volledige naam"
 */
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL ontbreekt.");
  process.exit(1);
}
const sql = neon(DATABASE_URL);

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS app_user (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      naam TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`;
}

async function upsert(email: string, password: string, naam: string) {
  const hash = await bcrypt.hash(password, 10);
  await sql`
    INSERT INTO app_user (email, password_hash, naam)
    VALUES (${email.toLowerCase()}, ${hash}, ${naam})
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, naam = EXCLUDED.naam`;
  console.log(`  ✓ ${email}  (wachtwoord: ${password})`);
}

async function main() {
  await ensureTable();
  const [email, password, naam] = process.argv.slice(2);

  console.log("👤 Gebruikers seeden...");
  if (email && password) {
    await upsert(email, password, naam || email);
  } else {
    // Standaardaccounts (wijzig het wachtwoord na de eerste login).
    await upsert("anniek@talentiacasa.nl", "Talenti2026!", "Anniek Houben-Wolbertus");
    await upsert("info@ai-adviesbureau.nl", "Talenti2026!", "AI Adviesbureau");
  }
  console.log("✅ Klaar. Log in op /login.");
}

main().catch((e) => {
  console.error("❌ Seed mislukt:", e);
  process.exit(1);
});

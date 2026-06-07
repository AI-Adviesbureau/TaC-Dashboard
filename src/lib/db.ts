import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL ontbreekt. Vul .env in (zie .env.example).");
}

/**
 * Neon serverless SQL-client. Gebruik als tagged template:
 *   const rows = await sql`select * from traject where regio = ${regio}`;
 * Parameters worden veilig geëscaped (geen SQL-injectie).
 */
export const sql = neon(process.env.DATABASE_URL);

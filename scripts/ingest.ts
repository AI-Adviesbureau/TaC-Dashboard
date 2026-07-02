/**
 * CLI-ingest: leest het Excel-totaaloverzicht en laadt het in Neon.
 * De inleeslogica zelf staat in src/lib/ingest-core.ts (gedeeld met de
 * in-app upload-module).
 *
 *   npm run ingest                 (data/totaaloverzicht.xlsx)
 *   npm run ingest -- pad/file.xlsx
 */
import * as path from "node:path";
import * as XLSX from "xlsx";
import { ingestWorkbook } from "../src/lib/ingest-core";

async function main() {
  const file = process.argv[2] || path.join(process.cwd(), "data", "totaaloverzicht.xlsx");
  console.log(`📖 Lees Excel: ${file}`);
  const wb = XLSX.readFile(file, { cellDates: true });

  console.log("🗄  Verwerken en laden in Neon...");
  const s = await ingestWorkbook(wb);

  console.log("\n" + "=".repeat(56));
  console.log("📊 DATASAMENVATTING");
  console.log("=".repeat(56));
  console.log(`Totaal trajecten:        ${s.trajecten}`);
  console.log(`Unieke cliënten (REL):   ${s.clienten}`);
  console.log(`Met doorlooptijd:        ${s.metDoorlooptijd}`);
  console.log(`Lopend (geen einddatum): ${s.lopend}`);
  console.log(`Totale omzet/budget:     € ${s.omzet.toLocaleString("nl-NL")}`);
  console.log(`Totale inkoopkosten:     € ${s.inkoop.toLocaleString("nl-NL")}`);
  console.log(`Per regio:               ${JSON.stringify(s.perRegio)}`);
  console.log(`Per jaar:                ${JSON.stringify(s.perJaar)}`);
  console.log(`Venlo-normen:            ${s.normen} · Plekken: ${s.plekken}`);
  console.log("\n⚠ Datakwaliteit-signalen:");
  Object.entries(s.issues)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`   ${k}: ${v}`));
  console.log("\n✅ Klaar.");
}

main().catch((e) => {
  console.error("\n❌ Ingest mislukt:", e);
  process.exit(1);
});

# Talenti a Casa — Managementdashboard

Een modulair, read-only managementdashboard voor jeugd-GGZ-aanbieder
**Talenti a Casa**. Het leest het Excel-totaaloverzicht in, normaliseert en
pseudonimiseert de data, en geeft inzicht in trajecten, kosten en prestaties.

Gebouwd met **Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Recharts**,
met **Neon (Postgres)** als database en een eigen **loginscherm**.

---

## Functionaliteit

- **Loginscherm** met sessie via httpOnly-cookie (JWT). Gebruikers staan in Neon.
- **Vier kern-KPI's**: doorlooptijd, kosten per cliënt, duurzame uitstroom,
  budgetrealisatie — voor Noord-Limburg, Midden-Limburg en Totaal.
- **Globale filters**: regio-schakelaar + periodekiezer (jaar/maand).
  → De periode (datum) start **leeg na elke browser-refresh** (bewuste keuze).
- **Modules**: Overzicht · Trajecten · Kosten & budget · Behandelaren · Beheer.
- **Trajecten**: doorzoekbaar, filterbaar (incl. status & betaling), sorteerbaar,
  kolommen tonen/verbergen, detailweergave met norm-doorlooptijd, en export naar
  **CSV én Excel**. Toont uitsluitend het relatienummer — **nooit naam of BSN**.
- **Drill-down**: klik in het overzicht op een gemeente of code → direct de
  bijbehorende trajecten.
- **Beheer**: **data uploaden** (Excel via de browser → Neon, met datasamenvatting
  en een "Data wissen"-knop), budgetplafonds invoeren (activeert de
  budgetrealisatie-KPI), productcode-omschrijvingen, behandelaar-namen, en eigen
  wachtwoord wijzigen.
- **Maandrapportage (PDF)**: knop "Exporteer rapportage" op het overzicht opent
  een print-klare rapportage (`/rapportage`) in huisstijl — opslaan als PDF voor
  het MT-overleg, met de op dat moment gekozen regio/periode.
- **Beveiliging**: bcrypt-wachtwoorden, rate-limiting op login, securityheaders.
- Inklapbaar zijmenu, officieel logo, soepele animaties, responsive (laptop + tablet).

Livegang naar productie (Vercel + Neon): zie **`docs/deployment.md`**.

## Aan de slag

```bash
npm install

# 1. Vul .env (zie .env.example) met de Neon DATABASE_URL en een AUTH_SECRET
# 2. Laad de data in vanuit het Excel-bestand (verwacht: data/totaaloverzicht.xlsx)
npm run ingest
# 3. Maak loginaccounts aan
npm run db:seed
# 4. Start de app
npm run dev      # http://localhost:3000
```

### Standaard logins (na `npm run db:seed`)

| E-mail                  | Wachtwoord     |
| ----------------------- | -------------- |
| anniek@talentiacasa.nl  | `Talenti2026!` |
| info@ai-adviesbureau.nl | `Talenti2026!` |

> Wijzig de wachtwoorden na de eerste login:
> `npm run db:seed -- e-mail nieuwwachtwoord "Volledige naam"`

## Data verversen (maandelijks)

**Via de app (aanbevolen):** log in → **Beheer → Data** → sleep het nieuwe
Excel-totaaloverzicht in het uploadvak → "Upload & verwerk". De oude data wordt
automatisch vervangen; je ziet meteen een datasamenvatting. Het bestand wordt
niet op de server bewaard. Met "Data wissen" maak je de dataset handmatig leeg.

**Via CLI (alternatief):** plaats het bestand als `data/totaaloverzicht.xlsx` en
draai `npm run ingest`.

Beide gebruiken dezelfde inleeslogica (`src/lib/ingest-core.ts`). Gebruikers,
budgetplafonds, code-omschrijvingen en behandelaar-namen blijven behouden.

## Budgetplafonds invullen

Budgetrealisatie toont realisatie zónder norm zolang er geen plafonds zijn. Vul
de tabel `budget_plafond` om de signaalkleuren te activeren, bv.:

```sql
INSERT INTO budget_plafond (jaar, gemeente, regio, plafond_bedrag)
VALUES (2026, 'Venlo', 'Noord-Limburg', 3000000);
```

## Architectuur

```
src/
  app/
    login/                  loginscherm
    (dashboard)/            beschermde modules (overzicht, trajecten, kosten, behandelaren)
    api/                    JSON-endpoints (auth + KPI's), elk met sessiecheck
  components/
    shell/                  sidebar, topbar, mobielmenu, dashboard-shell
    filters/                globale filterstatus (regio/jaar/maand, ephemeral)
    charts/ ui/             grafieken en herbruikbare UI
  lib/
    db.ts                   Neon-client
    normalize.ts            gedeelde normalisatie (regio, gemeente, datums)  <- ook door ingest
    kpi.ts trajecten.ts     KPI- en lijstqueries (server-only)
    config/modules.ts       moduleregistratie  <- nieuwe module = 1 regel
scripts/
  ingest.ts                 Excel -> Neon (pseudonimiseert, schoont op)
  seed-user.ts              loginaccounts
```

Een **nieuwe module** toevoegen = nieuwe route onder `app/(dashboard)/` +
één regel in `src/lib/config/modules.ts`.

## Privacy (AVG)

- Het dashboard en de database bevatten **nooit** naam, BSN of geboortedatum.
  Het ingest-script negeert die kolommen expliciet en bewaart alleen het
  relatienummer als pseudonieme sleutel.
- Het ruwe Excel-bestand staat in `data/` en is **gitignored** — niet committen.
- Zie `docs/decisions.md` voor de KPI-definities en gemaakte keuzes.

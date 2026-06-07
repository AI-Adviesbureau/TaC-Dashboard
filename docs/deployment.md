# Livegang & deployment

Het dashboard is een standaard Next.js 16-app en draait goed op **Vercel** met
**Neon** als database. Hieronder de stappen en de productie-checklist.

## 1. Database (Neon)

De Neon-database is al ingericht (project `TaC-Dashboard`). Voor een schone
productie-omgeving:

1. Maak (eventueel) een aparte Neon-branch `production`.
2. Zet de connection string klaar (Neon Console → Connection details, met
   `?sslmode=require`).

## 2. Vercel

1. Push de repo naar GitHub/GitLab en koppel die in Vercel (New Project).
2. Framework preset: **Next.js** (auto-gedetecteerd). Build command en output
   blijven standaard.
3. Zet de **Environment Variables** (Production + Preview):
   | Variabele | Waarde |
   | --- | --- |
   | `DATABASE_URL` | de Neon connection string |
   | `AUTH_SECRET` | een lange willekeurige string (zie hieronder) |
4. Deploy.

Genereer een sterke `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## 3. Data en gebruikers laden

De ingest en seed draai je lokaal (of via een eenmalige CI-stap) tegen de
productie-`DATABASE_URL`:

```bash
DATABASE_URL="<productie-url>" npm run ingest      # data uit data/totaaloverzicht.xlsx
DATABASE_URL="<productie-url>" npm run db:seed     # loginaccounts
```

> Het Excel-bestand staat in `data/` (gitignored) en gaat dus niet mee in de
> repo/deploy. Bewaar het intern.

## 4. Maandelijkse data-update

1. Plaats de nieuwe export als `data/totaaloverzicht.xlsx`.
2. `DATABASE_URL="<productie-url>" npm run ingest`.

`traject`/`plek` worden herbouwd; gebruikers, budgetplafonds, code-omschrijvingen
en behandelaar-namen blijven behouden.

## 5. Wachtwoorden

- Gebruikers wijzigen hun eigen wachtwoord in **Beheer → Account**.
- Een wachtwoord **resetten** (bv. vergeten) doe je via het seed-script:
  ```bash
  DATABASE_URL="<productie-url>" npm run db:seed -- iemand@talentiacasa.nl NieuwWachtwoord! "Volledige naam"
  ```
- Er is geen e-mail-gebaseerde self-service reset (geen mailserver in scope).

## Productie-checklist

- [ ] `AUTH_SECRET` is uniek en lang (niet de voorbeeldwaarde).
- [ ] Standaard seed-wachtwoorden zijn gewijzigd.
- [ ] `DATABASE_URL` gebruikt `sslmode=require`.
- [ ] Cookies zijn `secure` in productie (automatisch via `NODE_ENV`).
- [ ] Securityheaders staan aan (zie `next.config.ts`).
- [ ] Rate limiting op login staat aan (`src/lib/rate-limit.ts`). Voor meerdere
      serverless-instances: overweeg een gedeelde store (Upstash/Redis) zodat de
      limiet over instances heen geldt.
- [ ] Toegang vastgelegd: wie heeft een account en wie beheert de data.
- [ ] Ruwe Excel met PII staat niet in de repo of in de deploy.

## Beveiliging — huidige stand

- Auth via httpOnly, `SameSite=Lax`, in productie `secure` cookie (JWT, HS256).
- Edge-bescherming op alle routes via `src/proxy.ts`; API-routes checken de
  sessie zelf (`src/app/api/_guard.ts`).
- Wachtwoorden gehasht met bcrypt (cost 10).
- Rate limiting op login (8 pogingen / 15 min per IP).
- Securityheaders (X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy).
- Geen PII (naam/BSN/geboortedatum) in database, app, logs of export.

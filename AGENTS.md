<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Talenti a Casa — managementdashboard

Read-only jeugd-GGZ dashboard. Next.js 16 (App Router, src-dir) · TypeScript ·
Tailwind v4 · Recharts · Neon (Postgres).

## Hard requirements

- **Privacy/AVG**: never read or display naam/BSN/geboortedatum. The ingest
  drops those columns; only `rel_nr` (pseudonymous key) is stored. Keep it that way.
- **Datum leeg na refresh**: the global period filter (jaar/maand) lives in
  ephemeral React state (`src/components/filters/filter-context.tsx`) — never
  persist it to URL or storage. This is an explicit client wish.
- Raw Excel lives in `data/` (gitignored, may contain PII) — never commit it.

## Layout

- `src/app/(dashboard)/` — protected modules; `src/app/login/` — login.
- `src/app/api/*` — JSON endpoints, each guarded via `src/app/api/_guard.ts`.
- `src/proxy.ts` — edge auth (Next 16 "proxy", not "middleware").
- `src/lib/normalize.ts` — shared normalisation (used by app AND `scripts/ingest.ts`).
- `src/lib/kpi.ts`, `src/lib/trajecten.ts` — server-only queries.
- New module = route under `app/(dashboard)/` + one line in `src/lib/config/modules.ts`.

## Commands

`npm run dev|build|lint` · `npm run ingest` (Excel→Neon) · `npm run db:seed` (logins).

KPI definitions & confirmed decisions: `docs/decisions.md`.

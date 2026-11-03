# De Kansenmaker — Haags Verhaal

Eén online omgeving waarin mensen doelgroepen en behoeften ontdekken, ideeën delen en aanvullen, kansen en
risico’s onderzoeken, ideeën uitwerken tot concepten en samen werksessies houden.

**Status:** stap 1 (interface) en stap 2 (database, rechten, wachtwoordloos inloggen) zijn klaar. Gegevens worden
opgeslagen in Supabase; Row Level Security dwingt de rechten per project en rol af.

## Starten

```bash
npm install
```
```bash
npm run dev
```

Open http://localhost:3000 en log in met je e-mailadres. De app gebruikt standaard het Supabase-project
`kansenmaker`; een ander project koppel je met de variabelen uit `.env.example`.

Zie [docs/design-spec.md §15.5](docs/design-spec.md#155-instellingen-in-het-supabase-dashboard-handmatig) voor de
instellingen die in het Supabase-dashboard nodig zijn (redirect-URL's, e-mail).

## Documentatie

- [docs/design-spec.md](docs/design-spec.md) — ontwerp, routes, componenten, interacties, rollen,
  toegankelijkheid, database en tests.
- `supabase/migrations/` — databaseschema, rechten (RLS), triggers en functies.
- `supabase/tests/rls_test.sql` — rechtentest per rol (draait in een transactie en wordt teruggedraaid).

## Controles

```bash
npm run lint && npm run typecheck && npm run build
```
```bash
E2E_PASSWORD=… npm run check:e2e
```
```bash
E2E_PASSWORD=… npm run check:visual
```

De e2e- en visuele controle hebben tijdelijke testaccounts nodig (zie design-spec §15.6).

## Techniek

Next.js 16 (App Router) · TypeScript strict · Tailwind CSS 4 · shadcn/ui (Radix) · Lucide · Supabase (Postgres, Auth, Realtime).

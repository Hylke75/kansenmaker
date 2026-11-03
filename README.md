# De Kansenmaker — Haags Verhaal

Eén online omgeving waarin mensen doelgroepen en behoeften ontdekken, ideeën delen en aanvullen, kansen en
risico’s onderzoeken, ideeën uitwerken tot concepten en samen werksessies houden.

> **Status: klikbaar front-end prototype (stap 1).** Alle gegevens zijn fictieve **voorbeeldgegevens**. Er is nog
> geen database, inlogsysteem of e-maildienst gekoppeld; wijzigingen blijven alleen in het browservenster.

## Starten

```bash
npm install
```
```bash
npm run dev
```

Open http://localhost:3000. Via de knop **Prototype** in de header wissel je van fictieve gebruiker om de rollen
(beheerder, begeleider, redacteur, deelnemer, nieuwe gebruiker zonder project) te bekijken.

Tip: open `/sessies/s1/begeleiden` en `/sessie/s1` in twee tabbladen om begeleider en deelnemer samen te zien.

## Documentatie

- [docs/design-spec.md](docs/design-spec.md) — design tokens, navigatie, route-overzicht, componenten,
  interacties per scherm, gebruikersstromen, rollen, toegankelijkheid en testresultaten.

## Controles

```bash
npm run lint && npm run typecheck && npm run build
```
```bash
npm start
```
```bash
npm run check:functional
```
```bash
npm run check:visual
```

## Techniek

Next.js 16 (App Router) · TypeScript strict · Tailwind CSS 4 · shadcn/ui (Radix) · Lucide.

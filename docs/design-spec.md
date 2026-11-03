# De Kansenmaker — Design- en interactiespecificatie

Haags Verhaal · Front-end prototype (stap 1 van de bouwvolgorde) · november 2026

> **Status:** volledig klikbaar prototype met **fictieve voorbeeldgegevens**. Er is **geen database, geen
> authenticatie en geen e-maildienst** gekoppeld. Alle wijzigingen bestaan alleen in het geheugen van het
> browservenster en verdwijnen bij herladen. De interface zegt dat ook expliciet (badge ‘Voorbeeldgegevens’,
> knop ‘Prototype’ in de header en de tekst in iedere bevestigingsmelding). Acties die een backend nodig hebben
> (e-mail versturen, uitloggen, uitnodiging accepteren) geven een eerlijke foutmelding in plaats van succes te
> simuleren.

---

## Inhoud

1. [Uitgangspunten](#1-uitgangspunten)
2. [Huisstijlcontrole](#2-huisstijlcontrole)
3. [Ontwerpvariabelen (design tokens)](#3-ontwerpvariabelen-design-tokens)
4. [Navigatie en layout](#4-navigatie-en-layout)
5. [Route-overzicht](#5-route-overzicht)
6. [Componenten](#6-componenten)
7. [Schermen en interacties](#7-schermen-en-interacties)
8. [Gebruikersstromen](#8-gebruikersstromen)
9. [Rollen en rechten](#9-rollen-en-rechten)
10. [Datamodel in het prototype](#10-datamodel-in-het-prototype)
11. [Toegankelijkheid](#11-toegankelijkheid)
12. [Controle: desktop, tablet en mobiel](#12-controle-desktop-tablet-en-mobiel)
13. [Aannames en open punten voor de beoordeling](#13-aannames-en-open-punten-voor-de-beoordeling)
14. [Techniek en ontwikkeling](#14-techniek-en-ontwikkeling)

---

## 1. Uitgangspunten

- Iemand moet zonder uitleg met het systeem kunnen werken. Geen dashboards, grafieken of lange formulieren.
- Rustig, licht en vriendelijk: gebroken witte achtergrond, donkergroene typografie, warme gele primaire acties.
- **Maximaal één primaire (gele) knop per schermgedeelte.** Overige acties zijn secundair (groene rand) of tekstknoppen.
- **Maximaal drie invoervelden tegelijk zichtbaar.** Langere invoer wordt opgeknipt in stappen (Idee delen) of
  per onderdeel bewerkt (Haalbaarheid).
- Veel witruimte, grote koppen, kaarten met afgeronde hoeken (12–16 px), geen decoratieve illustraties in de werkruimte.
- Mobiel eerst: één kolom, grote aanraakvlakken (≥ 44 px), ‘Deel een idee’ altijd bereikbaar.
- WCAG 2.2 AA als ontwerp- en testdoel.

## 2. Huisstijlcontrole

De gevraagde kleuren zijn **voorlopige tokens**, geen geverifieerde huisstijl. Bij controle van
[haagsverhaal.nl](https://haagsverhaal.nl/) (Elementor-thema, gecontroleerd 3 november 2026) blijkt:

| Kenmerk | Op haagsverhaal.nl | In dit prototype | Actie |
|---|---|---|---|
| Kopletter | **Maven Pro**, vet | Maven Pro 600/700 (Google Fonts, zelf gehost via `next/font`) | Bevestigen |
| Broodtekst | **Open Sans** | Open Sans | Bevestigen |
| Handschriftletter | ‘schrijf’ (eigen font) | Niet gebruikt | Alleen eventueel op startpagina |
| Kleuren website | Teal `#66C1BE`, roze `#F39DAA`, oranje `#F49655`, geel `#FBE962`, rood `#EB1D1D`, magenta `#B6006E`, zwart | Voorstel: donkergroen `#103E30`, warm geel `#E8A638`, gebroken wit `#FAF8F3`, zachtgroen `#E5EBE1` | **Besluit nodig** |

**Conclusie:** de lettertypen van de site zijn overgenomen. Het kleurvoorstel wijkt duidelijk af van de
kleuren op de website. Alle kleuren staan centraal als CSS-variabelen in `src/app/globals.css` (`--km-*`), dus
een definitieve keuze is één aanpassing op één plek. Let bij een wissel op contrast: de websitekleuren (teal,
roze, geel) halen als tekstkleur op wit geen 4,5:1.

## 3. Ontwerpvariabelen (design tokens)

Gedefinieerd in `src/app/globals.css` en via `@theme` beschikbaar als Tailwind-klassen (`bg-km-green`, `text-km-muted` …).

### Kleur

| Token | Waarde | Gebruik | Contrast |
|---|---|---|---|
| `--km-green` | `#103E30` | Titels, navigatie, iconen, focusring | 11,3:1 op gebroken wit |
| `--km-green-hover` | `#1B5443` | Hover van groene elementen | — |
| `--km-yellow` | `#E8A638` | Primaire knoppen, accenten (actieve tab, voortgang) | Donkergroen op geel **5,7:1** |
| `--km-yellow-hover` | `#D9952A` | Hover primaire knop | — |
| `--km-offwhite` | `#FAF8F3` | Pagina-achtergrond | — |
| `--km-softgreen` | `#E5EBE1` | Kaarten, actieve menu-items | Donkergroen 9,9:1 |
| `#FFFFFF` | — | Formulieren en inhoud | — |
| `--km-text` | `#303B34` | Lopende tekst | 11,0:1 |
| `--km-muted` | `#5A6660` | Secundaire tekst | ≥ 4,9:1 op alle achtergronden |
| `--km-line` | `#D6DCD2` | Scheidingslijnen, kaartranden (decoratief) | — |
| `--km-line-strong` (`--input`) | `#8A968E` | Rand van invoervelden | 3,3:1 (≥ 3:1 voor UI-componenten) |
| `--km-danger` / `-soft` | `#B3261E` / `#FBEAE8` | Fouten, verwijderen, obstakel | 6,5:1 |
| `--km-warning-soft` / `-text` | `#FDF1DA` / `#6B4A00` | ‘Nieuw’, ‘Onbekend’, voorbeeldgegevens | > 7:1 |

> **Regel:** geel (`#E8A638`) is **nooit tekstkleur** en nooit de enige drager van informatie: op gebroken wit is
> het contrast maar 2,0:1. Geel wordt alleen gebruikt als vlak met donkergroene tekst.

### Statussen

Iedere status heeft **icoon + tekstlabel + kleur** (nooit alleen kleur), component `StatusBadge`.

| Status | Icoon | Kleuren (achtergrond / tekst) |
|---|---|---|
| Nieuw | Sparkles | `#FDF1DA` / `#6B4A00` |
| In ontwikkeling | CircleDashed | `#E5EBE1` / `#103E30` |
| Te onderzoeken | Search | `#EEEAF6` / `#45386B` |
| Klaar voor proef | FlaskConical | `#DCEFE4` / `#0C5536` |
| Afgerond | CircleCheck | `#ECEBE7` / `#3B3B37` |
| Gearchiveerd (extra) | Archive | wit / muted |
| Wacht op goedkeuring (extra) | Clock | wit / `#6B4A00` |

### Typografie

| Rol | Lettertype | Grootte (mobiel → desktop) |
|---|---|---|
| H1 paginatitel | Maven Pro 700 | 30 → 44 px (overzicht: 36 → 60 px) |
| H2 sectie | Maven Pro 700 | 24 → 30 px |
| H3 kaart/onderdeel | Maven Pro 700 | 18–20 px |
| Lopende tekst | Open Sans 400 | **16 px**, regelafstand 1,6 |
| Inleiding | Open Sans | 18–20 px |
| Labels, metadata | Open Sans 600 | 14–16 px |

Maximaal drie kopniveaus per pagina; precies één `h1` per pagina.

### Ruimte, vorm en maat

| Element | Specificatie |
|---|---|
| Inhoudsbreedte | max. **1200 px** (`max-w-[1200px]`) |
| Zijbalk | **240 px** desktop (≥ 1024 px); tablet standaard ingeklapt tot 72 px, uitklapbaar |
| Ruimte | 8, 16, 24, 32 px (Tailwind 2/4/6/8); secties 40–56 px |
| Radius | 12 px (velden, knoppen), 16 px (kaarten), volledig rond (badges, chips) |
| Knoppen en velden | min. **44 px** hoog (`min-h-11`), grote knop 48 px |
| Iconen | Lucide, lijnstijl, 16–20 px, altijd `aria-hidden` naast tekst |
| Animatie | Subtiel (hover, dialoog-fade); uitgeschakeld bij `prefers-reduced-motion` |

## 4. Navigatie en layout

**Zes hoofdonderdelen** in een vaste zijbalk, elk met een korte omschrijving:

| Onderdeel | Omschrijving | Route |
|---|---|---|
| Overzicht | Mijn projecten en recente activiteit | `/` |
| Ideeën | Ideeën verzamelen en verbeteren (incl. **kansenmuur** als weergave) | `/ideeen` |
| Doelgroepen | Doelgroepen en hun behoeften | `/doelgroepen` |
| Concepten | Ideeën uitwerken en onderzoeken (incl. onderzoek en acties) | `/concepten` |
| Sessies | Samen ideeën ontwikkelen | `/sessies` |
| Beheer | Projecten, uitnodigingen en instellingen | `/beheer` |

- **Desktop (≥ 1024 px):** zijbalk 240 px met logo, menu, gele knop ‘Deel een idee’ en ‘Menu inklappen’.
- **Tablet (768–1023 px):** zijbalk ingeklapt tot iconen (72 px) met tooltip; ‘Menu uitklappen’ toont de labels.
- **Mobiel (< 768 px):** hamburgerknop opent het menu als zijpaneel (dialoog met focusval, Esc sluit).
  Een **zwevende gele knop ‘Deel een idee’** staat altijd rechtsonder (niet op het formulier zelf en niet op
  het begeleiderscherm). De projectkiezer staat onder de header over de volle breedte.
- **Header:** projectkiezer, knop **‘Prototype’** (uitleg + wisselen van fictieve gebruiker/rol) en gebruikersmenu
  (profiel, uitloggen — beide melden eerlijk dat accounts nog niet gekoppeld zijn).
- **Skiplink** ‘Naar de inhoud’ is de eerste tabstop op elke pagina.
- **Focuslayout** (`(focus)`-routegroep) zonder zijbalk voor de sessieruimte, het printoverzicht en de uitnodigingspagina.

## 5. Route-overzicht

| # | Scherm | Route | Bestand (scherm) | Toegang |
|---|---|---|---|---|
| 1 | Overzicht / startscherm | `/` | `screens/overview.tsx` | Iedereen; zonder project → startscherm |
| 2 | Ideeënoverzicht (kaarten, lijst, kansenmuur) | `/ideeen` | `screens/ideas.tsx` | Projectleden |
| 3 | Idee toevoegen (3 stappen) | `/ideeen/nieuw` | `screens/idea-new.tsx` | Projectleden |
| 4 | Ideedetail met reacties en aanvullingen | `/ideeen/[id]` | `screens/idea-detail.tsx` | Projectleden (wachtende ideeën: auteur + moderatoren) |
| 5 | Doelgroepenoverzicht | `/doelgroepen` | `screens/audiences.tsx` | Projectleden; beheren: redacteur+ |
| 6 | Doelgroepdetail met behoeften | `/doelgroepen/[id]` | `screens/audience-detail.tsx` | Projectleden |
| 7 | Conceptenoverzicht | `/concepten` | `screens/concepts.tsx` | Projectleden; nieuw concept: redacteur, begeleider, beheerder |
| 8 | Conceptdetail, 5 tabbladen | `/concepten/[id]?tab=overzicht\|kansen\|haalbaarheid\|onderzoek\|acties` | `screens/concept-detail.tsx` | Projectleden; wijzigen: conceptbeheerders |
| 9 | Realiteitstoets ✓ ? × | `/concepten/[id]/realiteitstoets` | `screens/reality-check.tsx` | Bekijken: iedereen; beoordelen: conceptbeheerders |
| 10 | Sessiesoverzicht | `/sessies` | `screens/sessions.tsx` | Projectleden; plannen: begeleider, beheerder |
| — | Sessiepagina (info, link/QR, resultaten) | `/sessies/[id]` | `screens/session-detail.tsx` | Projectleden |
| 11 | Sessieruimte voor deelnemer | `/sessie/[id]` | `screens/participant.tsx` | Leden van het project van de sessie |
| 12 | Begeleiderscherm, 6 rondes + timer | `/sessies/[id]/begeleiden` | `screens/facilitator.tsx` | Begeleider, beheerder |
| 13 | Project- en gebruikersbeheer | `/beheer?tab=overzicht\|projecten\|gebruikers\|sessies\|inhoud\|instellingen` | `screens/admin.tsx` | Redacteur, begeleider, beheerder (tabbladen per rol) |
| — | Printvriendelijk overzicht | `/beheer/print` | `screens/print-overview.tsx` | Beheerder |
| — | Uitnodiging (landingspagina toegangslink) | `/uitnodiging/[id]` | `app/(focus)/uitnodiging/[id]/page.tsx` | Openbaar; meldt dat accepteren nog niet kan |
| — | Niet gevonden | elke onbekende URL | `app/not-found.tsx` | — |
| — | Foutpagina | bij een renderfout | `app/error.tsx` | — |

Pagina-bestanden staan in `src/app/(app)/…` (met AppShell) en `src/app/(focus)/…` (zonder zijbalk). Elke
`page.tsx` is een dunne server-component die het scherm uit `src/components/screens/` rendert.

## 6. Componenten

Alle Kansenmaker-componenten staan in `src/components/km/`; shadcn/ui-basiscomponenten (Radix) in
`src/components/ui/` (aangepast naar 44 px hoogte, 16 px tekst en de tokens).

| Component | Bestand | Doel en gedrag | Toegankelijkheid |
|---|---|---|---|
| **AppShell** | `app-shell.tsx` | Skiplink, zijbalk, header, `<main id="inhoud">` (max 1200 px), mobiele ‘Deel een idee’-knop | Landmarks, skiplink |
| **Sidebar** | `sidebar.tsx` | Zes onderdelen met omschrijving, primaire actie, in-/uitklappen (desktop 240 px, tablet 72 px) | `nav` met `aria-label`, `aria-current="page"`, `aria-expanded` op inklapknop, tooltips bij iconen |
| **Header** | `header.tsx` | Mobiel menu, projectkiezer, prototype-knop, gebruikersmenu | Toegankelijke namen beginnen met zichtbare tekst |
| MobileNav | `mobile-nav.tsx` | Menu als zijpaneel op mobiel; sluit na navigeren | Dialoog met focusval, Esc |
| ProjectPicker | `project-picker.tsx` | Wisselt project; alle inhoud is per project afgeschermd | Gelabelde select |
| PrototypeSwitcher | `prototype-switcher.tsx` | Uitleg prototype + wisselen van fictieve gebruiker (rol) | Radiogroep in dialoog |
| **PageHeader** | `page-header.tsx` | Terug-link, bovenregel, `h1`, beschrijving, meta (badges), acties | Eén `h1` |
| **PrimaryButton** | `primary-button.tsx` | De gele primaire actie; met `href` een link in knopvorm | ≥ 44 px, focusring |
| Button-varianten | `ui/button.tsx` | `default` (geel), `outline` (secundair), `secondary`, `ghost`, `destructive`, `link` | Tekst breekt af i.p.v. overlopen |
| **IdeaCard** | `idea-card.tsx` | Kaart (of lijstrij) met doelgroepen, status, beschrijving, aantal bijdragen | Hele kaart klikbaar via één link (één tabstop) |
| **AudienceCard** | `audience-card.tsx` | Doelgroep in zachtgroen met aantallen behoeften/ideeën/concepten | Idem |
| **ConceptCard** | `concept-card.tsx` | Concept met status, doelgroepen, eigenaar, aantal ideeën en open acties | Idem; `dl` voor metadata |
| **StatusBadge** | `status-badge.tsx` | Vijf statussen + ‘Gearchiveerd’ en ‘Wacht op goedkeuring’ | Icoon + label, sr-tekst ‘Status:’ |
| **EmptyState** | `empty-state.tsx` | Icoon, kop, uitleg en één vervolgactie | Kopniveau instelbaar |
| **FilterBar** | `filter-bar.tsx` | Zoekveld, selects (doelgroep, sorteren), statuschips, weergavewissel, resultaat, ‘Filters wissen’ | Chips met `aria-pressed`, resultaat in `role="status"` |
| **StepForm** | `step-form.tsx` | Stappen met voortgang, validatie per stap, Vorige/Volgende/Annuleren | Focus naar stapkop bij wissel, foutoverzicht krijgt focus |
| FormField / ErrorSummary | `form-field.tsx` | Label, hulptekst, foutmelding; foutoverzicht bovenaan | `aria-describedby`, `aria-invalid`, `role="alert"` |
| SampleDataNotice | `form-field.tsx` | Gestippelde badge ‘Voorbeeldgegevens’ | Tekst, geen kleur-alleen |
| **AssessmentControl** | `assessment-control.tsx` | Eén stelling met ✓ Aannemelijk / ? Onbekend / × Obstakel | **Native radioknoppen** in `fieldset`/`legend`; pijltjestoetsen |
| **SessionRound** | `session-round.tsx` | Ronde X van 6, titel, duur, opdracht; ook groot (presentatie) | `section` met label |
| RoundProgress | `session-round.tsx` | Zes balkjes voortgang | Lijst met `aria-label` |
| **Timer** + `useTimer` | `timer.tsx` | Aftellen per ronde; start/pauze, +1 minuut, opnieuw; gedeelde klok voor presentatiemodus | `role="timer"`; alleen mijlpalen (5 min, 1 min, tijd om) worden aangekondigd |
| **ConfirmDialog** | `confirm-dialog.tsx` | Bevestiging voor archiveren, verwijderen, afsluiten, klaar voor proef | `alertdialog`, focus start op **Annuleren** |
| **Toast** / `notify` | `toast.tsx` | Statusmeldingen (sonner). `notify.prototype()` zegt altijd ‘niets wordt opgeslagen’ | `aria-live`, sluitknop |
| ConceptCreateDialog | `concept-create-dialog.tsx` | Ideeën combineren tot concept (naam, beschrijving, ideeën) | Gevalideerd formulier |
| InviteLink | `invite-link.tsx` | Deelnamelink + QR-code + kopiëren | Gelabeld veld, QR met titel |
| SessionStateBadge | `session-state-badge.tsx` | Gepland / Actief / Afgesloten | Icoon + label |
| Guards | `guards.tsx` | `RequireProject`, `AccessDenied`, `NotInProject` | Verklapt niets over andere projecten |

## 7. Schermen en interacties

Alle wijzigingen hieronder gebeuren **in de voorbeeldgegevens** en tonen een melding ‘… · Alleen zichtbaar in
dit browservenster. Er is nog geen database gekoppeld; niets wordt opgeslagen.’

### 1 · Overzicht (`/`)
- Bovenregel ‘HAAGS VERHAAL’, titel ‘De Kansenmaker’, ‘Samen ontdekken we nieuwe mogelijkheden.’, actief project.
- Primaire knop **Deel een idee** → `/ideeen/nieuw`.
- Vier navigatiekaarten (Ideeën · Bekijk en vul aan, Doelgroepen · Ontdek behoeften, Concepten · Werk ideeën uit, Sessies · Denk samen verder) met aantallen.
- **Recent toegevoegd:** drie nieuwste ideeën; leeg → EmptyState met ‘Deel een idee’.
- **Mijn openstaande acties:** acties toegewezen aan de gebruiker, gesorteerd op deadline; ‘Te laat’ in rood met tekst.
- **Uitnodigingen voor sessies:** actieve sessie → ‘Doe mee’ (geel), geplande → ‘Bekijk’.
- **Recente activiteit:** zes laatste gebeurtenissen (ook nieuwe ideeën/bijdragen uit deze sessie).
- **Zonder project** (fictieve ‘Nieuwe gebruiker’): startscherm met uitleg in drie stappen en veld ‘Uitnodigingscode of link’. Leeg → fout ‘Vul de uitnodigingscode of -link in.’; ingevuld → fout dat uitnodigingen nog niet gecontroleerd kunnen worden (geen database).

### 2 · Ideeën (`/ideeen`)
- Zoekveld (titel + beschrijving), select **Doelgroep**, select **Sorteren** (nieuwste, oudste, meeste bijdragen, A–Z).
- Statuschips: Alles, Nieuw, In ontwikkeling, Te onderzoeken, Klaar voor proef, Afgerond, Gearchiveerd.
- Weergave: **Kaarten** (standaard), **Lijst** (compact), **Kansenmuur** (briefjes per status).
- Resultaattelling wordt aangekondigd; ‘Filters wissen’ verschijnt zodra er een filter actief is.
- Paginering per 6 (Vorige / Pagina x van y / Volgende); focus springt naar het begin van de resultaten.
- Lege toestanden: geen ideeën in project · geen resultaten bij filters.
- Ideeën die op goedkeuring wachten zijn alleen zichtbaar voor auteur en moderatoren.

### 3 · Idee toevoegen (`/ideeen/nieuw`)
| Stap | Velden (max. 3) | Validatie |
|---|---|---|
| 1 · Wat is je idee? | Naam (≤ 80 tekens), beschrijving (15–1000 tekens, teller) | Verplicht, met foutoverzicht en foutmelding per veld |
| 2 · Voor wie en waarom? | Doelgroepen (meerdere), passende behoeften (verschijnen na kiezen doelgroep), **optioneel**: ‘Welke behoefte of welk probleem lost dit op?’ | Alles optioneel — mag overgeslagen worden |
| 3 · Controleer en deel | Samenvatting; melding als het project goedkeuring vereist | — |
- Knoppen: Annuleren (stap 1) / Vorige, Volgende / **Deel je idee**. Annuleren met ingevulde gegevens → ConfirmDialog ‘Stoppen met dit idee?’.
- Na delen: naar het nieuwe idee + melding.

### 4 · Ideedetail (`/ideeen/[id]`)
- Titel, status, doelgroepen, auteur en datum; beschrijving; blok ‘Welke behoefte of welk probleem lost dit op?’.
- Zijkolom: **Status** wijzigen (conceptbeheerders), gekoppelde **behoeften**, **concepten** waar het idee deel van is, **gerelateerde ideeën**, **Archiveren** (ConfirmDialog) / Terugzetten.
- Acties: **Bewerken** (auteur of moderator; dialoog met 3 velden) en **Maak er een concept van** (conceptbeheerders).
- **Reacties en aanvullingen:** keuze ‘Reactie — een vraag of mening’ of ‘Aanvulling — maak het idee sterker’, tekst (≤ 1000). Leeg → fout. Aanvullingen krijgen een groene rand en label.
- Moderatoren: bijdrage **Verbergen/Tonen**, **Goedkeuren** bij wachtende bijdragen.
- Uitgeschakeld reageren (projectinstelling) of gearchiveerd idee → uitleg in plaats van formulier.
- Onbekend id of idee uit ander project → ‘Dit idee is niet gevonden’ (zonder details).

### 5 · Doelgroepen (`/doelgroepen`)
- Zoeken, categoriechips, AudienceCards (zachtgroen).
- **Doelgroep toevoegen** (redacteur+, dialoog: naam, beschrijving, categorie).
- **Samenvoegen** (beheerder): kies bron en doel → ConfirmDialog → behoeften, ideeën en concepten verhuizen.

### 6 · Doelgroepdetail (`/doelgroepen/[id]`)
- **Mogelijke behoeften** met per behoefte ‘Bediend door: [concepten]’ en aantal ideeën.
- **Nieuwe behoefte** toevoegen (leeg of dubbel → fout), behoefte verwijderen (ConfirmDialog; ontkoppelt ook).
- Zijkolom: gekoppelde concepten (met status) en ideeën. **Bewerken** van de doelgroep.

### 7 · Concepten (`/concepten`)
- Zoeken, statuschips met aantallen, ConceptCards. **Nieuw concept** (conceptbeheerders) → dialoog: naam, beschrijving, ideeën kiezen (min. 1). Ideeën blijven bestaan.

### 8 · Conceptdetail (`/concepten/[id]`)
- Kop met status, eigenaar, ‘Bevestigd door …’ en knop **Realiteitstoets**.
- Paneel **Status** + **Verantwoordelijke** (verantwoordelijke wijzigen: alleen beheerder).
  - **Klaar voor proef** door een niet-beheerder → foutmelding ‘Alleen een beheerder kan bevestigen…’.
  - Door een beheerder → ConfirmDialog met de uitkomst van de realiteitstoets; bevestiging wordt vastgelegd.
- Tabbladen (URL `?tab=` deelbaar; pijltjestoetsen):
  1. **Overzicht** — beschrijving, onderscheidend vermogen, **bijdrage aan ontmoeting en verbinding** (missievraag), doelgroepen, behoeften, gebaseerd op ideeën. Bewerken: dialoog met 3 velden.
  2. **Kansen en risico’s** — drie kolommen: Kansen (extern, helpt), Bedreigingen (extern, werkt tegen), Belemmeringen (intern). Toevoegen (soort + omschrijving), verwijderen.
  3. **Haalbaarheid** — Mensen, Middelen, Partners, Missie, Ontbrekende kennis; ieder blok apart ‘Wijzig’ (één veld tegelijk).
  4. **Onderzoek** — aannames met methode, status (Nog te doen / Bezig / Afgerond) en resultaat. ‘Afgerond’ vraagt eerst het resultaat (dialoog). Link naar realiteitstoets met huidige uitkomst.
  5. **Acties** — omschrijving, verantwoordelijke, deadline (niet in het verleden), status; afvinken met checkbox; ‘Te laat’ gemarkeerd met icoon + tekst.

### 9 · Realiteitstoets (`/concepten/[id]/realiteitstoets`)
Vijf stellingen met ✓ Aannemelijk · ? Onbekend · × Obstakel:
1. Er is een herkenbare behoefte
2. Het Haags Verhaal voegt iets unieks toe
3. Het concept past bij de missie
4. Uitvoering lijkt mogelijk met mensen en partners
5. **Het draagt bij aan ontmoeting, verbinding of verhalen die anders niet gehoord worden** (met de missievraag als hulptekst)

**Uitkomst** (live bijgewerkt, `role="status"`):
| Situatie | Uitkomst |
|---|---|
| Niets beoordeeld | Nog niet beoordeeld |
| Minstens één × | Er is minstens één obstakel — bespreek eerst of het op te lossen is |
| Minstens één ? of open punt | **Er ontbreken nog gegevens. Formuleer eerst een aantal onderzoeksvragen.** |
| Alles ✓ | Alle punten lijken aannemelijk — de beheerder kan besluiten over een proef |

Knop **Maak onderzoeksvragen van de onbekende punten** zet elk ‘?’ om in een onderzoeksvraag (geen dubbele).
Vaste tekst: ‘Deze beoordeling is geen automatische goedkeuring. De beheerder bepaalt of een concept verdergaat.’

### 10 · Sessies (`/sessies`)
- Groepen **Nu actief**, **Gepland**, **Afgesloten** met datum, locatie, aantal deelnemers en begeleider.
- Knoppen: Doe mee (actief), Begeleiden (begeleider/beheerder), Bekijk resultaten (afgesloten).
- **Nieuwe sessie** (dialoog: titel, datum/tijd — niet in het verleden, locatie) → sessiepagina.
- **Sessiepagina** (`/sessies/[id]`): deelnamelink + **QR-code** + kopiëren, de zes rondes (huidige gemarkeerd), deelnemers, **Sessie afsluiten** (ConfirmDialog), resultaten per ronde met stemmen en **CSV-export**.

### 11 · Sessieruimte deelnemer (`/sessie/[id]`)
- Eigen rustige layout. Toont **alleen de actieve opdracht**: voortgang, ronde X van 6, titel, duur, opdracht.
- Eén tekstveld + **Verstuur** (leeg/te lang → fout); eigen bijdragen van deze ronde eronder.
- **Stemronde (6):** ideeën uit ronde 3 en 4 als drukknoppen (`aria-pressed`), **max. 3 stemmen** (meer → foutmelding), teller wordt aangekondigd. Stemmen uitgeschakeld in project → uitleg.
- Gepland → ‘De sessie is nog niet begonnen’ (wordt vanzelf bijgewerkt); afgesloten → bedankt + resultaten.
- Geen lid van het project of onbekende link → ‘Deze sessie is niet beschikbaar’.

### 12 · Begeleiderscherm (`/sessies/[id]/begeleiden`)
- ‘LIVE WERKSESSIE’, titel, status. Gepland → **Start de sessie** (met link/QR).
- Huidige ronde (SessionRound), **Timer** (start/pauze, +1 minuut, opnieuw; reset bij rondewissel), **Vorige / Volgende ronde**; laatste ronde → **Sessie afronden** (ConfirmDialog).
- Rondelijst: direct naar een ronde springen (`aria-current="step"`).
- **Binnenkomende antwoorden** van de huidige ronde met **Verbergen/Tonen**; in de stemronde gesorteerd op stemmen.
- **Uitnodigen** klapt link + QR open. **Presentatiemodus**: schermvullend, grote ronde, grote timer (dezelfde klok), zichtbare antwoorden, Vorige/Volgende; **Esc** of ‘Sluiten’.
- ‘Live’ in het prototype: begeleiderscherm en sessieruimte in **twee tabbladen van dezelfde browser** blijven synchroon (BroadcastChannel). Echte live-samenwerking volgt in stap 4.

### 13 · Beheer (`/beheer`)
Tabbladen per rol:
| Tab | Inhoud | Rollen |
|---|---|---|
| Overzicht | Aantallen (ideeën, concepten, deelnemers, komende sessies), openstaande beoordelingen, conceptstatussen, recente activiteit — **geen grafieken** | Redacteur, begeleider, beheerder |
| Projecten | Projecten maken, wijzigen, archiveren/herstellen, openen | Beheerder |
| Gebruikers | Leden met rol (wijzigen: beheerder; eigen rol niet), uit project halen (ConfirmDialog). **Uitnodigen**: via e-mail (geeft eerlijke fout: geen e-maildienst) of **toegangslink** met vervaldatum (7/14/30 dagen). Uitnodigingen met status Actief/Verlopen/Ingetrokken en **Intrekken**. Begeleiders nodigen alleen deelnemers uit. | Begeleider, beheerder |
| Sessies | Alle sessies, **Afsluiten** | Begeleider, beheerder |
| Inhoud | Wachtende ideeën (goedkeuren/archiveren), wachtende of verborgen bijdragen (goedkeuren/tonen/verbergen), link naar doelgroepen samenvoegen | Redacteur, beheerder |
| Instellingen en export | Schakelaars: deelname op uitnodiging, ideeën direct zichtbaar, reageren, stemmen, bijdragen eerst goedkeuren. Export: **Ideeën (CSV)**, **Concepten (CSV)**, **Printvriendelijk overzicht** | Beheerder |
- Deelnemer → ‘Je hebt geen toegang tot dit onderdeel’ met uitleg.

## 8. Gebruikersstromen

1. **Idee delen** — Overzicht of overal ‘Deel een idee’ → stap 1 (naam, beschrijving) → stap 2 (doelgroep, optionele behoefte/probleem) → stap 3 controleren → Deel je idee → ideedetail.
2. **Idee aanvullen** — Ideeën → filter/zoek → kaart → kies Reactie of Aanvulling → Plaats bijdrage.
3. **Doelgroep verkennen** — Doelgroepen → kaart → behoeften met de concepten die ze bedienen → ideeën voor deze doelgroep.
4. **Van ideeën naar concept** — Ideedetail ‘Maak er een concept van’ of Concepten ‘Nieuw concept’ → ideeën kiezen → conceptdetail.
5. **Concept onderzoeken** — Overzicht invullen (incl. missiebijdrage) → Kansen en risico’s → Haalbaarheid → Realiteitstoets → ‘Maak onderzoeksvragen’ → Onderzoek: status en resultaat → Acties met verantwoordelijke en deadline.
6. **Klaar voor proef** — Beheerder kiest status ‘Klaar voor proef’ → bevestigingsdialoog toont de uitkomst van de realiteitstoets → bevestigen → ‘Bevestigd door …’.
7. **Werksessie van 90 minuten** — Begeleider: Sessies → Nieuwe sessie → link/QR delen → Begeleiden → Start → zes rondes (10+15+25+15+15+10 min) met timer en presentatiemodus → antwoorden modereren → stemronde → Sessie afronden → resultaten exporteren. Deelnemer: QR/link → sessieruimte → per ronde antwoord versturen → stemmen.
8. **Mensen uitnodigen** — Beheer → Gebruikers → Uitnodigen → toegangslink (rol, geldigheid) → link kopiëren; intrekken in de lijst.
9. **Modereren** — Beheer → Instellingen ‘Bijdragen eerst goedkeuren’ aan → nieuwe ideeën/bijdragen krijgen ‘Wacht op goedkeuring’ → Beheer → Inhoud → goedkeuren.
10. **Nieuwe gebruiker zonder project** — startscherm met uitleg en uitnodigingsveld (geen leeg dashboard).

## 9. Rollen en rechten

Centraal vastgelegd in `src/lib/permissions.ts` (`can(role, permission)`); rechten gelden **per project**.

| Functie | Deelnemer | Redacteur | Begeleider | Beheerder |
|---|:-:|:-:|:-:|:-:|
| Idee toevoegen | ✓ | ✓ | ✓ | ✓ |
| Eigen ideeën wijzigen | ✓ | ✓ | ✓ | ✓ |
| Ideeën van anderen aanvullen | ✓ | ✓ | ✓ | ✓ |
| Bijdragen modereren | — | ✓ | — | ✓ |
| Concepten beheren (incl. doelgroepen/behoeften) | — | ✓ | ✓ | ✓ |
| ‘Klaar voor proef’ bevestigen, verantwoordelijke toewijzen | — | — | — | ✓ |
| Sessies begeleiden | — | — | ✓ | ✓ |
| Gebruikers uitnodigen | — | — | ✓ (alleen deelnemers) | ✓ |
| Projectinstellingen wijzigen, export | — | — | — | ✓ |
| Gebruikersrechten beheren, doelgroepen samenvoegen | — | — | — | ✓ |

In het prototype wissel je van rol via **Prototype** in de header: Sanne (beheerder), Youssef (begeleider),
Marieke (redacteur), Daan (deelnemer) en ‘Nieuwe gebruiker’ (geen projecten). In stap 2 wordt dit afgedwongen met
Supabase Row Level Security; de interface-controles blijven als extra laag.

## 10. Datamodel in het prototype

Types in `src/lib/types.ts`, voorbeeldgegevens in `src/lib/sample-data.ts`, opslag in het geheugen in `src/lib/store.tsx`.
Objecten volgens het functioneel ontwerp: **Project** (+ instellingen), **Doelgroep**, **Behoefte**, **Idee**,
**Concept** (met kansen/bedreigingen/belemmeringen, haalbaarheid, onderzoek, realiteitstoets), **Actie**, plus
gebruikers, lidmaatschappen (rol per project), sessies, sessie-antwoorden (met stemmen), bijdragen
(reactie/aanvulling), uitnodigingen en activiteit.

Functionele regels die het prototype al volgt: idee ↔ meerdere doelgroepen; concept uit meerdere ideeën; idee
blijft bestaan na koppeling; ‘Klaar voor proef’ pas na bevestiging door bevoegde gebruiker; deelnemer wijzigt alleen
eigen bijdragen; inhoud van andere projecten is nooit zichtbaar (ook niet via een directe URL); gearchiveerde
ideeën verdwijnen uit gewone overzichten (filter ‘Gearchiveerd’ toont ze).

## 11. Toegankelijkheid

Maatregelen (doel WCAG 2.2 AA):
- **Contrast:** alle tekstkleuren ≥ 4,5:1, invoerranden ≥ 3:1 (zie §3); geel nooit als tekst.
- **Toetsenbord:** skiplink; logische tabvolgorde; zichtbare focusring (3 px donkergroen, 2 px offset);
  tabbladen en radiogroepen met pijltjestoetsen; dialogen met focusval, Esc en focusherstel; ConfirmDialog
  start op ‘Annuleren’; kaarten hebben één link (één tabstop).
- **Doelgrootte:** knoppen, velden, chips en menu-items ≥ 44 × 44 px (ruim boven WCAG 2.2 2.5.8, 24 px).
- **Formulieren:** zichtbare labels, hulptekst en fouten gekoppeld met `aria-describedby`, `aria-invalid`,
  foutoverzicht met focus; geen validatie alleen op kleur.
- **Status niet alleen met kleur:** statussen, ‘te laat’, verborgen bijdragen en realiteitstoets hebben tekst/icoon.
- **Live-regio’s:** resultaattellingen, uitkomst realiteitstoets, stemteller, timer-mijlpalen, toasts.
- **Structuur:** `lang="nl"`, één `h1` per pagina, landmarks (`header`, `nav`, `main`, `aside`), `aria-current`.
- **Beweging:** `prefers-reduced-motion` schakelt animaties en overgangen uit.
- **Reflow:** geen horizontaal scrollen op 390 px breed; tekst kan vergroot worden (relatieve eenheden).

Bekende beperkingen: nog niet getest met echte schermlezers (NVDA, VoiceOver) en niet met gebruikers; dat staat
gepland voor stap 5. QR-code is een aanvulling, de link is altijd ook als tekst beschikbaar.

## 12. Controle: desktop, tablet en mobiel

Uitgevoerd op de productiebuild (`next build && next start`) met Playwright/Chromium:

**Visueel en toegankelijkheid** — `scripts/visual-check.mjs`
- 23 routes (incl. alle vijf concepttabbladen, drie beheertabbladen, print, uitnodiging en 404) × 3 breedtes:
  **mobiel 390 × 844**, **tablet 820 × 1180**, **desktop 1440 × 900** = 69 controles.
- Per controle: volledige screenshot, horizontale overloop, consolefouten, axe-core (regels WCAG 2.0/2.1/2.2 A + AA).
- **Resultaat:** 0 axe-overtredingen, 0 px horizontale overloop, geen consolefouten behalve de bedoelde 404 op de
  testroute `/bestaat-niet`.
- Tijdens de controle gevonden en opgelost: overlopende ✓?×-knoppen en lange knopteksten op mobiel, 14 px tekst
  in tabbladen, afgekapte projectkiezer op mobiel, toegankelijke namen die niet met zichtbare tekst begonnen
  (logo, gebruikersmenu, verberg-knoppen), onjuiste `dl`-structuur bij Haalbaarheid, te laag contrast bij verborgen
  bijdragen (doorzichtigheid), en onbetrouwbare pijltjestoetsselectie in de realiteitstoets (nu native radioknoppen).

**Functioneel** — `scripts/functional-check.mjs`, **18/18 geslaagd**:
skiplink · actieve navigatie · idee toevoegen met validatie in drie stappen · zoeken, statusfilter, drie weergaven
en paginering · bijdrage met foutmelding en plaatsen · archiveren via bevestiging (focus op Annuleren) · vijf
concepttabbladen met URL en pijltjestoetsen · actie toevoegen en afvinken · realiteitstoets met toetsenbord, uitkomst
en onderzoeksvragen · ‘Klaar voor proef’ (redacteur: fout, beheerder: bevestiging) · begeleiden: rondes, timer,
presentatiemodus met Esc · sessieruimte: fout bij leeg, versturen · synchronisatie begeleider ↔ deelnemer tussen
tabbladen · beheer: eerlijke e-mailfout, toegangslink, instelling wisselen · deelnemer zonder toegang tot beheer en
begeleiden · startscherm zonder project · nette melding bij onbekend idee · mobiel menu en zwevende ‘Deel een idee’.

Opnieuw draaien:
```bash
npm run build && npm start
```
```bash
npm run check:functional
```
```bash
npm run check:visual
```

## 13. Aannames en open punten voor de beoordeling

1. **Kleuren** — voorstel wijkt af van de website (§2). Kiezen: voorstel houden, website-kleuren of een mengvorm.
2. **Namen van de zes rondes** — het werkboek was niet beschikbaar. Aangenomen: 1 Kennismaken en doel (10) ·
   2 Doelgroepen en behoeften (15) · 3 Nieuwe ideeën (25) · 4 Aanvullen en combineren (15) · 5 Kansen en risico’s (15) ·
   6 Kiezen en vervolgstappen (10) = 90 minuten. Graag vergelijken met het werkboek.
3. **Missievraag** is als vijfde stelling in de realiteitstoets én als tekstveld in het concept-overzicht opgenomen.
4. **Wie bevestigt ‘Klaar voor proef’** — nu alleen de beheerder (‘De beheerder bepaalt of een concept verdergaat’).
5. **Kansenmuur** is gegroepeerd per status. Alternatief: per doelgroep.
6. **Stemmen** — drie stemmen per deelnemer, op ideeën uit ronde 3 en 4.
7. **Begeleiders** zien de tabbladen Overzicht, Gebruikers (alleen deelnemers uitnodigen) en Sessies in Beheer;
   redacteuren Overzicht en Inhoud.
8. **Logo** — tijdelijk woordmerk; graag officiële logobestanden aanleveren.
9. **Persoonsgegevens verwijderen** is bewust nog niet gebouwd (vereist backend en een AVG-procedure).

**Niet gebouwd in deze stap** (conform opdracht): database, authenticatie, Row Level Security, e-mail,
echte live-samenwerking, PDF/Word-rapportage, AI-functies. Vercel en Supabase zijn aangemaakt maar nog **niet**
gekoppeld; dat is stap 2 na akkoord op dit prototype.

## 14. Techniek en ontwikkeling

- **Next.js 16** (App Router, Turbopack, Cache Components), **React 19**, **TypeScript strict**, **Tailwind CSS 4**,
  **shadcn/ui** (Radix-variant), **Lucide**-iconen, `sonner` (toasts), `qrcode.react`.
- Structuur:
  ```
  src/app/(app)/…        pagina's met AppShell
  src/app/(focus)/…      sessieruimte, print, uitnodiging (zonder zijbalk)
  src/components/km/     Kansenmaker-componenten
  src/components/ui/     shadcn/ui-basis (aangepast)
  src/components/screens/ schermen (client components)
  src/lib/               types, voorbeeldgegevens, opslag, rechten, CSV, opmaak
  src/hooks/             media query, vandaag, origin
  scripts/               visuele en functionele controle
  ```
- Ontwikkelen: `npm install`, `npm run dev` → http://localhost:3000.
- Controles: `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm run check:visual`, `npm run check:functional`
  (Playwright moet beschikbaar zijn; de app draait op `http://localhost:3000`).

## Bijlage: screenshots

Gemaakt tijdens de controle (productiebuild, voorbeeldgegevens). Alle 69 screenshots kun je zelf genereren met
`npm run check:visual`.

| Desktop | |
|---|---|
| ![Overzicht](screenshots/desktop-overzicht.png) | ![Ideeën](screenshots/desktop-ideeen.png) |
| ![Ideedetail](screenshots/desktop-idee-detail.png) | ![Doelgroepdetail](screenshots/desktop-doelgroep-detail.png) |
| ![Concept – kansen en risico’s](screenshots/desktop-concept-kansen.png) | ![Realiteitstoets](screenshots/desktop-realiteitstoets.png) |
| ![Begeleiderscherm](screenshots/desktop-begeleiden.png) | ![Beheer – gebruikers](screenshots/desktop-beheer-gebruikers.png) |

| Tablet | Mobiel | | | |
|---|---|---|---|---|
| ![Ideeën tablet](screenshots/tablet-ideeen.png) | ![Overzicht mobiel](screenshots/mobiel-overzicht.png) | ![Idee toevoegen mobiel](screenshots/mobiel-idee-nieuw.png) | ![Realiteitstoets mobiel](screenshots/mobiel-realiteitstoets.png) | ![Sessieruimte mobiel](screenshots/mobiel-sessieruimte.png) |

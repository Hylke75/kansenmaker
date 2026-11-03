/**
 * End-to-end-test tegen de echte Supabase-database.
 *
 * Vereist tijdelijke testaccounts (zie docs/design-spec.md §15 – testen) met een wachtwoord,
 * omdat de app zelf wachtwoordloos inlogt. Het script logt per rol in via de Supabase-API en
 * zet de sessiecookies in de browser.
 *
 * Gebruik:
 *   E2E_PASSWORD=… node scripts/e2e-supabase.mjs [basis-url]
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const { createServerClient } = require("@supabase/ssr");

const base = process.argv[2] ?? "http://localhost:3000";
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://taonpzydehufcqyouzyp.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_vbDuAgsT38aC8fLerGM4Ig_ZWCw1m3D";
const PW = process.env.E2E_PASSWORD;
if (!PW) throw new Error("Zet E2E_PASSWORD");

const RUN = Date.now().toString(36);
const OPEN = [];
const results = [];
const check = async (name, fn) => {
  try {
    await fn();
    results.push(["OK  ", name]);
  } catch (e) {
    const toasts = [];
    for (const u of OPEN) {
      try {
        toasts.push(...(await u.page.locator("[data-sonner-toast]").allInnerTexts()).map((t) => t.replace(/\s+/g, " ")));
      } catch {
        /* pagina gesloten */
      }
    }
    results.push(["FOUT", `${name}: ${e.message.split("\n")[0]}${toasts.length ? ` | meldingen: ${toasts.join(" / ")}` : ""}`]);
  }
};
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

/** Sessiecookies ophalen zoals @supabase/ssr ze zet. */
async function sessionCookies(email) {
  const jar = new Map();
  const db = createServerClient(URL_, KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  });
  const { error } = await db.auth.signInWithPassword({ email, password: PW });
  if (error) throw new Error(`Inloggen ${email}: ${error.message}`);
  return [...jar].map(([name, value]) => ({ name, value, url: base }));
}

const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
const browser = await chromium.launch(proxy ? { proxy: { server: proxy, bypass: "localhost,127.0.0.1" } } : {});
const pageErrors = [];
async function asUser(email) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "nl-NL" });
  ctx.setDefaultTimeout(12000);
  if (email) await ctx.addCookies(await sessionCookies(email));
  const page = await ctx.newPage();
  OPEN.push({ page });
  page.on("pageerror", (e) => pageErrors.push(`${email}: ${e.message}`));
  return { ctx, page };
}
const go = (page, path) => page.goto(base + path, { waitUntil: "networkidle" });

const admin = await asUser("e2e-beheer@kansenmaker.test");
const deelnemer = await asUser("e2e-deelnemer@kansenmaker.test");
const begeleider = await asUser("e2e-begeleider@kansenmaker.test");
const anon = await asUser(null);

const IDEA = `E2E-idee ${RUN}`;
const AUD = `E2E-doelgroep ${RUN}`;
let ideaUrl = "";
let conceptUrl = "";

await check("Niet ingelogd → doorgestuurd naar inloggen; validatie e-mailadres", async () => {
  const { page } = anon;
  await go(page, "/ideeen");
  expect(page.url().includes("/inloggen?next=%2Fideeen"), `url: ${page.url()}`);
  await page.getByRole("button", { name: "Stuur mij een inloglink" }).click();
  await page.getByText("Vul je e-mailadres in.").first().waitFor();
  await page.getByLabel("E-mailadres").fill("geen-adres");
  await page.getByRole("button", { name: "Stuur mij een inloglink" }).click();
  await page.getByText("Dit e-mailadres lijkt niet te kloppen").first().waitFor();
});

await check("Beheerder: overzicht toont het project uit de database", async () => {
  const { page } = admin;
  await go(page, "/");
  await page.getByText("E2E-testproject").first().waitFor();
  await page.getByRole("heading", { name: "KansenKamer" }).waitFor();
});

await check("Beheerder: doelgroep en behoefte toevoegen (blijft na herladen)", async () => {
  const { page } = admin;
  await go(page, "/doelgroepen");
  await page.getByRole("button", { name: "Doelgroep toevoegen" }).first().click();
  await page.getByLabel("Naam").fill(AUD);
  await page.getByLabel("Beschrijving").fill("Doelgroep uit de geautomatiseerde test");
  await page.getByRole("button", { name: "Toevoegen", exact: true }).click();
  await page.waitForURL(/\/doelgroepen\/[0-9a-f-]{36}/);
  await page.getByLabel("Nieuwe behoefte").fill("Elkaar ontmoeten");
  await page.getByRole("button", { name: "Toevoegen" }).click();
  await page.getByRole("heading", { name: "Elkaar ontmoeten" }).waitFor();
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Elkaar ontmoeten" }).waitFor();
});

await check("Deelnemer: idee delen in drie stappen", async () => {
  const { page } = deelnemer;
  await go(page, "/ideeen/nieuw");
  await page.getByLabel("Hoe noem je jouw idee?").fill(IDEA);
  await page.getByLabel("Wat houdt het idee in?").fill("Een idee dat via de echte database wordt opgeslagen.");
  await page.getByRole("button", { name: "Volgende" }).click();
  await page.getByText(AUD, { exact: true }).click();
  await page.getByText("Elkaar ontmoeten", { exact: true }).click();
  await page.getByRole("button", { name: "Volgende" }).click();
  await page.getByRole("button", { name: "Deel je idee" }).click();
  await page.waitForURL(/\/ideeen\/[0-9a-f-]{36}/);
  ideaUrl = new URL(page.url()).pathname;
  await page.getByRole("heading", { level: 1, name: IDEA }).waitFor();
  await page.getByText("Je idee is gedeeld").first().waitFor();
});

await check("Deelnemer: aanvulling plaatsen; geen statuswijziging en geen beheer", async () => {
  const { page } = deelnemer;
  await page.getByRole("radio", { name: /Aanvulling/ }).click();
  await page.getByLabel("Jouw bijdrage").fill("Aanvulling uit de test");
  await page.getByRole("button", { name: "Plaats bijdrage" }).click();
  await page.getByText("Je aanvulling is toegevoegd").first().waitFor();
  await page.locator("li").getByText("Aanvulling uit de test").waitFor();
  expect((await page.getByRole("heading", { name: "Status", exact: true }).count()) === 0, "deelnemer ziet statuskeuze");
  await go(page, "/beheer");
  await page.getByText("Je hebt geen toegang tot dit onderdeel").waitFor();
});

await check("Beheerder ziet idee en bijdrage van deelnemer, maakt er een concept van", async () => {
  const { page } = admin;
  await go(page, ideaUrl);
  await page.locator("li").getByText("Aanvulling uit de test").waitFor();
  await page.getByRole("button", { name: "Maak er een concept van" }).click();
  await page.getByRole("button", { name: "Concept maken" }).click();
  await page.waitForURL(/\/concepten\/[0-9a-f-]{36}/);
  conceptUrl = new URL(page.url()).pathname;
  await page.getByRole("heading", { level: 1, name: IDEA }).waitFor();
});

await check("Realiteitstoets wordt opgeslagen en blijft na herladen", async () => {
  const { page } = admin;
  await go(page, `${conceptUrl}/realiteitstoets`);
  // Twee keuzes direct na elkaar (regressietest: de tweede mag de eerste niet overschrijven)
  let saves = 0;
  page.on("response", (r) => r.url().includes("/rpc/set_assessment") && r.ok() && (saves += 1));
  await page.getByRole("group", { name: "Er is een herkenbare behoefte" }).getByText("Aannemelijk").click();
  await page.getByRole("group", { name: "Het concept past bij de missie" }).getByText("Onbekend").click();
  await page.getByText("Er ontbreken nog gegevens").waitFor();
  for (let i = 0; i < 50 && saves < 2; i++) await page.waitForTimeout(200);
  expect(saves >= 2, `slechts ${saves} van 2 keuzes bevestigd door de database`);
  await page.reload({ waitUntil: "networkidle" });
  const g = page.getByRole("group", { name: "Het concept past bij de missie" });
  await g.getByRole("radio", { name: /Onbekend/ }).waitFor({ state: "attached" });
  expect(await g.getByRole("radio", { name: /Onbekend/ }).isChecked(), "keuze missie niet bewaard");
  const g2 = page.getByRole("group", { name: "Er is een herkenbare behoefte" });
  expect(await g2.getByRole("radio", { name: /Aannemelijk/ }).isChecked(), "keuze behoefte niet bewaard (overschreven?)");
  await page.getByRole("button", { name: /Maak onderzoeksvragen/ }).click();
  await page.getByRole("link", { name: /Bekijk de onderzoeksvragen/ }).waitFor();
});

await check("Klaar voor proef: begeleider krijgt fout, beheerder bevestigt (vastgelegd in database)", async () => {
  await go(begeleider.page, conceptUrl);
  await begeleider.page.getByLabel("Status", { exact: true }).click();
  await begeleider.page.getByRole("option", { name: /Klaar voor proef/ }).click();
  await begeleider.page.getByText("Alleen een beheerder kan bevestigen").first().waitFor();
  const { page } = admin;
  await go(page, conceptUrl);
  await page.getByLabel("Status", { exact: true }).click();
  await page.getByRole("option", { name: "Klaar voor proef" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Ja, klaar voor proef" }).click();
  await page.getByText("Bevestigd door Test Beheerder").waitFor();
});

await check("Actie toevoegen en afvinken", async () => {
  const { page } = admin;
  await go(page, `${conceptUrl}?tab=acties`);
  await page.getByLabel("Wat moet er gebeuren?").fill(`Testactie ${RUN}`);
  await page.getByRole("button", { name: "Actie toevoegen" }).click();
  await page.getByText(`Actie toegewezen aan`).first().waitFor();
  await page.getByText(`Testactie ${RUN}`).waitFor();
  await page.getByRole("checkbox").last().click();
  await page.getByText("Actie afgevinkt").first().waitFor();
});

let sessionPath = "";
await check("Begeleider plant sessie, maakt deelnamelink en start", async () => {
  const { page } = begeleider;
  await go(page, "/sessies");
  await page.getByRole("button", { name: "Nieuwe sessie" }).first().click();
  await page.getByLabel("Titel").fill(`E2E-sessie ${RUN}`);
  const d = new Date(Date.now() + 3600_000);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  await page.getByLabel("Datum en tijd").fill(local);
  await page.getByRole("button", { name: "Sessie plannen" }).click();
  await page.waitForURL(/\/sessies\/[0-9a-f-]{36}$/);
  sessionPath = new URL(page.url()).pathname;
  await page.getByRole("button", { name: "Maak deelnamelink en QR-code" }).click();
  await page.locator('input[readonly][value*="/doe-mee/"]').waitFor();
  await go(page, `${sessionPath}/begeleiden`);
  await page.getByRole("button", { name: "Start de sessie" }).click();
  await page.getByRole("heading", { name: "Kennismaken en doel" }).waitFor();
});

await check("Live: deelnemer volgt rondewissel en antwoord verschijnt bij begeleider", async () => {
  const sid = sessionPath.split("/").pop();
  await go(deelnemer.page, `/sessie/${sid}`);
  await deelnemer.page.getByRole("heading", { name: "Kennismaken en doel" }).waitFor();
  await begeleider.page.getByRole("button", { name: "Volgende ronde" }).first().click();
  await deelnemer.page.getByRole("heading", { name: "Doelgroepen en behoeften" }).waitFor({ timeout: 15000 });
  await deelnemer.page.getByLabel("Doelgroep en behoefte").fill(`Live antwoord ${RUN}`);
  await deelnemer.page.getByRole("button", { name: "Verstuur" }).click();
  await deelnemer.page.getByText("Verstuurd naar de begeleider").first().waitFor();
  await begeleider.page.getByText(`Live antwoord ${RUN}`, { exact: true }).waitFor({ timeout: 15000 });
});

const IDEA2 = `E2E-tweede idee ${RUN}`;


await check("Stap 3: sessie-antwoord omzetten in een idee (begeleider)", async () => {
  const { page } = begeleider;
  await page.getByRole("button", { name: /Maak er een idee van/ }).first().click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel("Naam van het idee").fill(`Uit sessie ${RUN}`);
  await dlg.getByRole("button", { name: "Idee aanmaken" }).click();
  await page.getByText("Idee aangemaakt").first().waitFor();
  await page.getByRole("link", { name: /Omgezet naar idee/ }).first().waitFor();
  await go(page, "/ideeen");
  await page.getByText(`Uit sessie ${RUN}`).first().waitFor();
});

await check("Stap 3: koppelingen van een idee bewerken (blijft na herladen)", async () => {
  const { page } = admin;
  await go(page, "/ideeen/nieuw");
  await page.getByLabel("Hoe noem je jouw idee?").fill(IDEA2);
  await page.getByLabel("Wat houdt het idee in?").fill("Tweede idee om te combineren en te koppelen.");
  await page.getByRole("button", { name: "Volgende" }).click();
  await page.getByRole("button", { name: "Volgende" }).click();
  await page.getByRole("button", { name: "Deel je idee" }).click();
  await page.waitForURL(/\/ideeen\/[0-9a-f-]{36}/);

  await page.getByRole("button", { name: /Koppelen doelgroepen en behoeften/ }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByText(AUD, { exact: true }).click();
  await dlg.getByText("Elkaar ontmoeten", { exact: true }).click();
  await dlg.getByRole("button", { name: "Bewaren" }).click();
  await page.getByText("Koppelingen bewaard").first().waitFor();
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Elkaar ontmoeten" }).waitFor();
});

await check("Stap 3: gerelateerd idee koppelen en ontkoppelen", async () => {
  const { page } = admin;
  await page.getByLabel("Koppel een gerelateerd idee").click();
  await page.getByRole("option", { name: IDEA, exact: true }).click();
  await page.getByRole("button", { name: "Koppel", exact: true }).click();
  await page.getByText("Ideeën aan elkaar gekoppeld").first().waitFor();
  await go(page, ideaUrl);
  await page.getByRole("link", { name: IDEA2 }).waitFor();
  await page.getByRole("button", { name: `Koppeling met ‘${IDEA2}’ verwijderen` }).click();
  await page.getByText("Koppeling verwijderd").first().waitFor();
});

await check("Stap 3: twee ideeën selecteren en combineren tot concept", async () => {
  const { page } = admin;
  await go(page, "/ideeen");
  await page.getByRole("button", { name: "Ideeën combineren" }).click();
  await page.getByRole("checkbox", { name: `Selecteer ‘${IDEA}’` }).check();
  await page.getByRole("checkbox", { name: `Selecteer ‘${IDEA2}’` }).check();
  await page.getByText("2 ideeën geselecteerd").waitFor();
  await page.getByRole("button", { name: "Combineer tot concept" }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel("Naam van het concept").fill(`Gecombineerd ${RUN}`);
  await dlg.getByRole("button", { name: "Concept maken" }).click();
  await page.waitForURL(/\/concepten\/[0-9a-f-]{36}/);
  await page.getByRole("link", { name: IDEA }).waitFor();
  await page.getByRole("link", { name: IDEA2 }).waitFor();
});

await check("Stap 3: koppelingen van een concept bewerken", async () => {
  const { page } = admin;
  await page.getByRole("button", { name: "Koppelingen bewerken" }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByRole("checkbox", { name: IDEA2 }).uncheck();
  await dlg.getByRole("button", { name: "Bewaren" }).click();
  await page.getByText("Koppelingen bewaard").first().waitFor();
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("link", { name: IDEA }).waitFor();
  expect((await page.getByRole("link", { name: IDEA2 }).count()) === 0, "ontkoppeld idee nog zichtbaar");
});

await check("Stap 3: onderzoek en acties wijzigen en verwijderen", async () => {
  const { page } = admin;
  const base0 = new URL(page.url()).pathname;
  await go(page, `${base0}?tab=onderzoek`);
  await page.getByLabel("Aanname").fill(`Aanname ${RUN}`);
  await page.getByRole("button", { name: "Toevoegen" }).click();
  await page.getByText("Onderzoeksvraag toegevoegd").first().waitFor();
  await page.getByRole("button", { name: `Wijzig ‘Aanname ${RUN}’` }).click();
  await page.getByRole("dialog").getByLabel("Resultaat en bewijs").fill("Vijf gesprekken: positief.");
  await page.getByRole("dialog").getByRole("button", { name: "Bewaren" }).click();
  await page.getByText("Vijf gesprekken: positief.").waitFor();
  await page.getByRole("button", { name: `Verwijder ‘Aanname ${RUN}’` }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Verwijderen" }).click();
  await page.getByText("Onderzoeksvraag verwijderd").first().waitFor();
  await go(page, `${base0}?tab=acties`);
  await page.getByLabel("Wat moet er gebeuren?").fill(`Actie ${RUN}`);
  await page.getByRole("button", { name: "Actie toevoegen" }).click();
  await page.getByText("Actie toegewezen aan").first().waitFor();
  await page.getByRole("button", { name: `Wijzig ‘Actie ${RUN}’` }).click();
  await page.getByRole("dialog").getByLabel("Wat moet er gebeuren?").fill(`Actie gewijzigd ${RUN}`);
  await page.getByRole("dialog").getByRole("button", { name: "Bewaren" }).click();
  await page.getByText(`Actie gewijzigd ${RUN}`).waitFor();
  await page.getByRole("button", { name: `Verwijder ‘Actie gewijzigd ${RUN}’` }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Verwijderen" }).click();
  await page.getByText("Actie verwijderd").first().waitFor();
});

await check("Stap 3: conceptkaarten tonen realiteitstoets en sorteren op kansrijk", async () => {
  const { page } = admin;
  await go(page, "/concepten");
  await page.getByText("Realiteitstoets:").first().waitFor();
  await page.getByText(/aannemelijk · .* onbekend · .* obstakel/).first().waitFor();
  expect((await page.getByLabel("Sorteren").textContent())?.includes("Meest kansrijk"), "sortering niet standaard kansrijk");
});

await check("Gast: meedoen aan sessie met alleen de link (geen account), begeleider ziet het live", async () => {
  await go(begeleider.page, sessionPath);
  const link = await begeleider.page.locator('input[readonly][value*="/doe-mee/"]').inputValue();
  await go(begeleider.page, `${sessionPath}/begeleiden`);
  const gast = await asUser(null);
  await gast.page.goto(link, { waitUntil: "networkidle" });
  expect(!gast.page.url().includes("/inloggen"), "gast werd naar inloggen gestuurd");
  await gast.page.getByRole("button", { name: "Doe mee" }).click();
  await gast.page.getByText("Vul je naam in.").first().waitFor();
  await gast.page.getByLabel("Hoe mag de begeleider je noemen?").fill(`Gast ${RUN}`);
  await gast.page.getByRole("button", { name: "Doe mee" }).click();
  await gast.page.getByText(`Je doet mee als`).waitFor();
  await gast.page.getByLabel("Doelgroep en behoefte").fill(`Gastantwoord ${RUN}`);
  await gast.page.getByRole("button", { name: "Verstuur" }).click();
  await gast.page.getByText("Verstuurd naar de begeleider").first().waitFor();
  await begeleider.page.getByText(`Gastantwoord ${RUN}`, { exact: true }).waitFor({ timeout: 15000 });
  await begeleider.page.getByText(`Gast ${RUN} (gast)`).first().waitFor();
  // De gast komt niet in de rest van de app
  await gast.page.goto(base + "/ideeen", { waitUntil: "networkidle" });
  expect(gast.page.url().includes("/inloggen"), "gast kon de app in zonder inlog");
  // Herladen: gast blijft aangemeld in deze browser
  await gast.page.goto(link, { waitUntil: "networkidle" });
  await gast.page.getByText(`Gastantwoord ${RUN}`).waitFor();
  await gast.ctx.close();
});

await check("Inzendlink: idee insturen zonder account, wacht op goedkeuring, beheerder keurt goed", async () => {
  const { page } = admin;
  await go(page, "/beheer?tab=gebruikers");
  await page.getByRole("button", { name: "Uitnodigen" }).click();
  await page.getByRole("button", { name: "Inzendlink" }).click();
  await page.getByRole("button", { name: "Maak inzendlink" }).click();
  const link = await page.locator('input[readonly][value*="/insturen/"]').inputValue();
  await page.getByRole("button", { name: "Klaar" }).click();
  const gast = await asUser(null);
  await gast.page.goto(link, { waitUntil: "networkidle" });
  expect(!gast.page.url().includes("/inloggen"), "inzendlink vroeg om inlog");
  await gast.page.getByLabel("Hoe noem je jouw idee?").fill(`Gastidee ${RUN}`);
  await gast.page.getByLabel("Wat houdt het idee in?").fill("Een idee van iemand zonder account.");
  await gast.page.getByRole("button", { name: "Volgende" }).click();
  await gast.page.getByRole("button", { name: "Verstuur je idee" }).click();
  await gast.page.getByText("Vul je naam in.").first().waitFor();
  await gast.page.getByLabel("Je naam").fill(`Insturer ${RUN}`);
  await gast.page.getByRole("button", { name: "Verstuur je idee" }).click();
  await gast.page.getByText("Bedankt voor je idee!").waitFor();
  await gast.ctx.close();
  // Deelnemer ziet het idee nog niet; beheerder wel (wacht op goedkeuring)
  await go(deelnemer.page, "/ideeen");
  expect((await deelnemer.page.getByText(`Gastidee ${RUN}`).count()) === 0, "deelnemer ziet niet-goedgekeurd gastidee");
  await go(page, "/beheer?tab=inhoud");
  await page.getByText(`door Insturer ${RUN} (gast)`).waitFor();
  await page.getByRole("listitem").filter({ hasText: `Gastidee ${RUN}` }).getByRole("button", { name: /Goedkeuren/ }).click();
  await page.getByText("Idee goedgekeurd").first().waitFor();
  await go(deelnemer.page, "/ideeen");
  await deelnemer.page.getByText(`Gastidee ${RUN}`).first().waitFor();
});

await check("Nieuwe gebruiker: startscherm, uitnodiging accepteren via toegangslink", async () => {
  const { page } = admin;
  await go(page, "/beheer?tab=gebruikers");
  await page.getByRole("button", { name: "Uitnodigen" }).click();
  await page.getByRole("button", { name: "Toegangslink" }).click();
  await page.getByRole("button", { name: "Maak toegangslink" }).click();
  const link = await page.locator('input[readonly][value*="/uitnodiging/"]').inputValue();
  const nieuw = await asUser(process.env.E2E_NEW_EMAIL ?? "e2e-nieuw@kansenmaker.test");
  await go(nieuw.page, "/");
  await nieuw.page.getByRole("heading", { name: "Welkom in de KansenKamer" }).waitFor();
  await nieuw.page.getByRole("heading", { name: "Hoe heet je?" }).waitFor();
  await nieuw.page.getByLabel("Uitnodigingscode of link").fill(link);
  await nieuw.page.getByRole("button", { name: "Doe mee" }).click();
  await nieuw.page.getByText("E2E-testproject").first().waitFor();
  await nieuw.page.getByRole("button", { name: "Uitnodiging accepteren" }).click();
  await nieuw.page.waitForURL(base + "/");
  await nieuw.page.getByText("Je werkt in").waitFor();
  await go(nieuw.page, "/ideeen");
  await nieuw.page.getByText(IDEA).first().waitFor();
  await nieuw.ctx.close();
});

await check("Uitnodiging bekijken zonder in te loggen; ongeldige link geeft nette melding", async () => {
  const { page } = anon;
  await go(page, "/uitnodiging/00000000-0000-0000-0000-000000000000");
  await page.getByText("Deze uitnodiging werkt niet (meer)").waitFor();
  await go(page, "/uitnodiging/onzin");
  await page.getByText("Deze uitnodiging bestaat niet.").waitFor();
});

await check("Uitloggen", async () => {
  const { page } = deelnemer;
  await go(page, "/");
  await page.getByRole("button", { name: /gebruikersmenu/ }).click();
  await page.getByRole("menuitem", { name: "Uitloggen" }).click();
  await page.waitForURL(/\/inloggen/);
  await go(page, "/ideeen");
  expect(page.url().includes("/inloggen"), "na uitloggen nog toegang");
});

await browser.close();
for (const [s, n] of results) console.log(s, n);
if (pageErrors.length) console.log("Paginafouten:", pageErrors);
const failed = results.filter(([s]) => s === "FOUT").length;
console.log(`${results.length - failed}/${results.length} geslaagd`);
process.exit(failed ? 1 : 0);

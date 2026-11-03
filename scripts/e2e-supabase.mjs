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
  await page.getByRole("heading", { name: "De Kansenmaker" }).waitFor();
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
  await page.getByRole("group", { name: "Er is een herkenbare behoefte" }).getByText("Aannemelijk").click();
  await page.getByRole("group", { name: "Het concept past bij de missie" }).getByText("Onbekend").click();
  await page.getByText("Er ontbreken nog gegevens").waitFor();
  await page.waitForLoadState("networkidle");
  await page.reload({ waitUntil: "networkidle" });
  const g = page.getByRole("group", { name: "Het concept past bij de missie" });
  await g.getByRole("radio", { name: /Onbekend/ }).waitFor({ state: "attached" });
  expect(await g.getByRole("radio", { name: /Onbekend/ }).isChecked(), "keuze niet bewaard");
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
  await page.locator('input[readonly][value*="/uitnodiging/"]').waitFor();
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
  await begeleider.page.getByText(`Live antwoord ${RUN}`).waitFor({ timeout: 15000 });
});

await check("Nieuwe gebruiker: startscherm, uitnodiging accepteren via toegangslink", async () => {
  const { page } = admin;
  await go(page, "/beheer?tab=gebruikers");
  await page.getByRole("button", { name: "Uitnodigen" }).click();
  await page.getByRole("button", { name: "Toegangslink" }).click();
  await page.getByRole("button", { name: "Maak toegangslink" }).click();
  const link = await page.locator('input[readonly][value*="/uitnodiging/"]').inputValue();
  const nieuw = await asUser("e2e-nieuw@kansenmaker.test");
  await go(nieuw.page, "/");
  await nieuw.page.getByRole("heading", { name: "Welkom bij De Kansenmaker" }).waitFor();
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

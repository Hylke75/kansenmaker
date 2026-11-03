/**
 * Functionele controle van de belangrijkste gebruikersstromen (prototype).
 * Gebruik: node scripts/functional-check.mjs [basis-url]
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const base = process.argv[2] ?? "http://localhost:3000";
const results = [];
const check = async (name, fn) => {
  try {
    await fn();
    results.push(["OK  ", name]);
  } catch (e) {
    results.push(["FOUT", `${name}: ${e.message.split("\n")[0]}`]);
  }
};
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "nl-NL" });
ctx.setDefaultTimeout(6000);
const page = await ctx.newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));

const go = async (path) => {
  await page.goto(base + path, { waitUntil: "networkidle" });
};
const switchUser = async (name) => {
  await page.getByRole("button", { name: /Prototype/ }).first().click();
  await page.getByRole("radio", { name: new RegExp(name) }).click();
  await page.waitForTimeout(200);
};

await check("Skiplink is eerste tabstop en springt naar inhoud", async () => {
  await go("/");
  await page.keyboard.press("Tab");
  const txt = await page.evaluate(() => document.activeElement?.textContent);
  expect(txt?.includes("Naar de inhoud"), `eerste focus: ${txt}`);
  await page.keyboard.press("Enter");
  expect((await page.evaluate(() => location.hash)) === "#inhoud", "hash niet #inhoud");
});

await check("Navigatie: zijbalk markeert actieve pagina", async () => {
  await go("/");
  await page.getByRole("navigation", { name: "Hoofdnavigatie" }).getByRole("link", { name: /Concepten/ }).click();
  await page.waitForURL("**/concepten");
  const current = await page.locator('[aria-current="page"]').first().textContent();
  expect(current?.includes("Concepten"), `aria-current: ${current}`);
});

await check("Idee toevoegen: validatie, drie stappen, opslaan in voorbeeldgegevens", async () => {
  await go("/ideeen/nieuw");
  await page.getByRole("button", { name: "Volgende" }).click();
  await page.getByRole("alert").filter({ hasText: "Controleer het volgende" }).waitFor();
  expect(await page.getByText("Geef je idee een naam.").first().isVisible(), "foutmelding naam ontbreekt");
  await page.getByLabel("Hoe noem je jouw idee?").fill("Testidee buurtfeest");
  await page.getByLabel("Wat houdt het idee in?").fill("Een buurtfeest waar bewoners hun verhalen delen.");
  await page.getByRole("button", { name: "Volgende" }).click();
  await page.getByText("Stap 2 van 3").waitFor();
  await page.getByText("Bewoners", { exact: true }).click();
  await page.getByRole("button", { name: "Volgende" }).click();
  await page.getByText("Stap 3 van 3").waitFor();
  await page.getByRole("button", { name: "Deel je idee" }).click();
  await page.waitForURL(/\/ideeen\/idee-/);
  await page.getByRole("heading", { level: 1, name: "Testidee buurtfeest" }).waitFor();
  await page.getByText("niets wordt opgeslagen").first().waitFor();
});

await check("Ideeën: zoeken, statusfilter, weergaven en paginering", async () => {
  await go("/ideeen");
  await page.getByLabel("Zoek in ideeën").fill("wandeling");
  await page.getByText("1 idee gevonden").waitFor();
  await page.getByRole("button", { name: "Filters wissen" }).first().click();
  await page.getByRole("button", { name: "Te onderzoeken", exact: true }).click();
  await page.getByText("2 ideeën gevonden").waitFor();
  await page.getByRole("button", { name: "Alles", exact: true }).click();
  await page.getByRole("button", { name: "Lijst" }).click();
  await page.getByRole("button", { name: "Volgende" }).click();
  await page.getByText("Pagina 2 van 2").waitFor();
  await page.getByRole("button", { name: "Kansenmuur" }).click();
  await page.getByRole("region", { name: "Te onderzoeken" }).waitFor();
  await page.getByLabel("Zoek in ideeën").fill("xyzxyz");
  await page.getByText("Geen ideeën gevonden").waitFor();
});

await check("Ideedetail: lege bijdrage geeft fout, bijdrage plaatsen werkt", async () => {
  await go("/ideeen/i1");
  await page.getByRole("button", { name: "Plaats bijdrage" }).click();
  await page.getByText("Schrijf eerst je bijdrage.").first().waitFor();
  await page.getByRole("radio", { name: /Aanvulling/ }).click();
  await page.getByLabel("Jouw bijdrage").fill("Testaanvulling vanuit de controle.");
  await page.getByRole("button", { name: "Plaats bijdrage" }).click();
  await page.getByText("Testaanvulling vanuit de controle.").waitFor();
});

await check("Idee archiveren via bevestigingsdialoog", async () => {
  await go("/ideeen/i5");
  await page.getByRole("button", { name: "Archiveren" }).click();
  const dlg = page.getByRole("alertdialog");
  await dlg.waitFor();
  expect(await page.evaluate(() => document.activeElement?.textContent) === "Annuleren", "focus niet op Annuleren");
  await dlg.getByRole("button", { name: "Archiveren" }).click();
  await page.getByText("Gearchiveerd").first().waitFor();
});

await check("Concept: vijf tabbladen, URL volgt het tabblad", async () => {
  await go("/concepten/c1");
  for (const [label, key] of [["Kansen en risico’s", "kansen"], ["Haalbaarheid", "haalbaarheid"], ["Onderzoek", "onderzoek"], ["Acties", "acties"], ["Overzicht", "overzicht"]]) {
    await page.getByRole("tab", { name: label }).click();
    await page.waitForURL(`**tab=${key}`);
  }
  await page.getByRole("tab", { name: "Overzicht" }).focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(300);
  expect((await page.getByRole("tab", { name: "Kansen en risico’s" }).getAttribute("aria-selected")) === "true", "pijltjestoets werkt niet");
});

await check("Concept: actie toevoegen en afvinken", async () => {
  await go("/concepten/c1?tab=acties");
  await page.getByRole("button", { name: "Actie toevoegen" }).click();
  await page.getByText("Beschrijf de actie.").first().waitFor();
  await page.getByLabel("Wat moet er gebeuren?").fill("Testactie");
  await page.getByRole("button", { name: "Actie toevoegen" }).click();
  await page.getByText("Testactie", { exact: true }).waitFor();
  await page.getByRole("checkbox").last().click();
});

await check("Realiteitstoets: keuze per toetsenbord, uitkomst en onderzoeksvragen", async () => {
  await go("/concepten/c2/realiteitstoets");
  await page.getByText("Er ontbreken nog gegevens").waitFor();
  const group = page.getByRole("group", { name: "Het concept past bij de missie" });
  await group.getByText("Obstakel").click();
  await page.getByText("Er is minstens één obstakel").waitFor();
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(300);
  expect((await group.getByRole("radio", { name: /Onbekend/ }).isChecked()), "pijltjestoets kiest geen optie");
  await page.getByRole("button", { name: /Maak onderzoeksvragen/ }).click();
  await page.getByRole("link", { name: /Bekijk de onderzoeksvragen/ }).waitFor();
});

await check("Klaar voor proef: redacteur krijgt foutmelding, beheerder bevestigt", async () => {
  await go("/concepten/c1");
  await switchUser("Marieke");
  await page.getByLabel("Status", { exact: true }).click();
  await page.getByRole("option", { name: /Klaar voor proef/ }).click();
  await page.getByText("Alleen een beheerder kan bevestigen").waitFor();
  await switchUser("Sanne");
  await page.goto(base + "/concepten/c1");
  await page.getByLabel("Status", { exact: true }).click();
  await page.getByRole("option", { name: "Klaar voor proef" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Ja, klaar voor proef" }).click();
  await page.getByText("Bevestigd door Sanne de Vries").waitFor();
});

await check("Begeleiden: rondes, timer en presentatiemodus (Esc sluit)", async () => {
  await go("/sessies/s1/begeleiden");
  await page.getByRole("button", { name: "Volgende ronde" }).first().click();
  await page.getByRole("heading", { name: "Aanvullen en combineren" }).waitFor();
  await page.getByRole("button", { name: "Start timer" }).click();
  await page.waitForTimeout(1300);
  const t = await page.getByRole("timer").textContent();
  expect(t !== "15:00", `timer loopt niet: ${t}`);
  await page.getByRole("button", { name: "Presentatiemodus" }).click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "detached" });
  await page.getByRole("button", { name: /6\. Kiezen/ }).click();
  await page.getByRole("heading", { name: "Stemmen op ideeën" }).waitFor();
});

await check("Sessieruimte: lege invoer geeft fout, antwoord versturen werkt; stemmen max 3", async () => {
  await go("/sessie/s1");
  await page.getByRole("button", { name: "Verstuur" }).click();
  await page.getByText("Schrijf eerst je antwoord.").waitFor();
  await page.getByLabel("Jouw idee").fill("Mijn testidee in de sessie");
  await page.getByRole("button", { name: "Verstuur" }).click();
  await page.getByText("Jouw bijdragen in deze ronde (1)").waitFor();
});

await check("Live tussen tabbladen: deelnemer ziet rondewissel van begeleider", async () => {
  const p2 = await ctx.newPage();
  await p2.goto(base + "/sessie/s1", { waitUntil: "networkidle" });
  await go("/sessies/s1/begeleiden");
  await page.getByRole("button", { name: /5\. Kansen/ }).click();
  await p2.getByRole("heading", { name: "Kansen en risico’s" }).waitFor({ timeout: 3000 });
  await p2.close();
});

await check("Beheer: e-mailuitnodiging geeft eerlijke fout, toegangslink werkt, instelling wisselt", async () => {
  await go("/beheer?tab=gebruikers");
  await page.getByRole("button", { name: "Uitnodigen" }).click();
  await page.getByLabel("E-mailadres").fill("iemand@voorbeeld.nl");
  await page.getByRole("button", { name: "Verstuur uitnodiging" }).click();
  await page.getByText("er is nog geen e-maildienst gekoppeld").first().waitFor();
  await page.getByRole("button", { name: "Toegangslink" }).click();
  await page.getByRole("button", { name: "Maak toegangslink" }).click();
  await page.getByText("De toegangslink is klaar").waitFor();
  await page.getByRole("button", { name: "Klaar" }).click();
  await page.getByRole("tab", { name: "Instellingen en export" }).click();
  const sw = page.getByRole("switch", { name: /Stemmen toegestaan/ });
  await sw.click();
  expect((await sw.getAttribute("aria-checked")) === "false", "schakelaar wisselt niet");
});

await check("Rollen: deelnemer heeft geen toegang tot beheer en begeleiden", async () => {
  await go("/beheer");
  await switchUser("Daan");
  await page.getByText("Je hebt geen toegang tot dit onderdeel").waitFor();
  await page.goto(base + "/sessies/s1/begeleiden");
  await switchUser("Daan");
  await page.getByText("Je hebt geen toegang tot dit onderdeel").waitFor();
});

await check("Gebruiker zonder projecten krijgt startscherm met uitnodigingsveld", async () => {
  await go("/");
  await switchUser("Nieuwe gebruiker");
  await page.getByRole("heading", { name: "Welkom bij De Kansenmaker" }).waitFor();
  await page.getByRole("button", { name: "Doe mee" }).click();
  await page.getByText("Vul de uitnodigingscode of -link in.").first().waitFor();
});

await check("Niet-bestaand idee toont nette melding", async () => {
  await go("/ideeen/bestaat-niet");
  await page.getByText("Dit idee is niet gevonden").waitFor();
});

await check("Mobiel: menu opent als dialoog, navigeert en sluit", async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await go("/");
  await page.getByRole("button", { name: "Menu openen" }).click();
  await page.getByRole("dialog").getByRole("link", { name: /Doelgroepen/ }).click();
  await page.waitForURL("**/doelgroepen");
  await page.getByRole("dialog").waitFor({ state: "detached" });
  expect(await page.getByRole("link", { name: "Deel een idee" }).last().isVisible(), "mobiele ‘Deel een idee’ niet zichtbaar");
});

await browser.close();
for (const [s, n] of results) console.log(s, n);
if (pageErrors.length) console.log("Paginafouten:", pageErrors);
const failed = results.filter(([s]) => s === "FOUT").length;
console.log(`${results.length - failed}/${results.length} geslaagd`);
process.exit(failed ? 1 : 0);

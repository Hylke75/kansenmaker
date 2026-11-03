/**
 * Doorloopt de zes stappen als deelnemer (mobiel), met axe-core (WCAG 2.2 AA) en screenshots.
 * Vereist een testaccount met rol deelnemer in een testproject (zie docs/design-spec.md §18).
 * Gebruik: E2E_PASSWORD=… [E2E_STEPS_EMAIL=…] node scripts/steps-check.mjs [basis-url] [uitvoermap]
 */
import { createRequire } from "node:module"; const require = createRequire(import.meta.url);
const { chromium } = require("playwright"); const { AxeBuilder } = require("@axe-core/playwright");
const B = process.argv[2] ?? "http://localhost:3000", OUT = process.argv[3] ?? "steps-shots", R = Date.now().toString(36);
const EMAIL = process.env.E2E_STEPS_EMAIL ?? "e2e-stappen@kansenmaker.test";
require("node:fs").mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: "localhost,127.0.0.1" } });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
const main = () => p.getByRole("main").filter({ visible: true });
const axe = async (name) => {
  const r = await new AxeBuilder({ page: p }).withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa","wcag22aa"]).analyze();
  const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  console.log(`${name}: axe ${r.violations.length ? r.violations.map((v) => v.id + "(" + v.nodes.length + "):" + v.nodes[0].target).join(", ") : "ok"}${sw ? " HORIZONTAAL SCROLLEN" : ""}`);
  await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
};
await p.goto(B + "/inloggen?next=/stappen/1");
await p.getByRole("button", { name: "Inloggen met wachtwoord" }).click();
await p.getByRole("textbox", { name: "E-mailadres" }).fill(EMAIL);
await p.locator("input[type=password]:visible").fill(process.env.E2E_PASSWORD);
await p.getByRole("button", { name: "Inloggen", exact: true }).click();
await p.waitForURL((u) => u.pathname === "/stappen/1"); await p.getByRole("heading", { name: "De kracht van het Haags Verhaal" }).waitFor();
for (const t of ["Netwerk", "Creativiteit"]) {
  await p.getByLabel("Een sterk punt van het Haags Verhaal").fill(`${t} ${R}`);
  await p.getByRole("button", { name: "Voeg een sterk punt toe" }).click();
}
for (const t of ["Netwerk", "Creativiteit"]) await main().getByText(`${t} ${R}`).waitFor({ timeout: 15000 });
await axe("stap1");
await p.getByRole("link", { name: /Naar stap 2/ }).click(); await p.waitForURL(/stappen\/2/);
await p.getByRole("button", { name: "Voeg een doelgroep toe" }).click();
await p.getByLabel("Naam").fill(`Expats ${R}`); await p.getByLabel("Beschrijving").fill("Internationale medewerkers bij Haagse organisaties");
await p.getByRole("button", { name: "Toevoegen", exact: true }).click();
await main().getByText(`Expats ${R}`).waitFor({ timeout: 15000 }); console.log("url na doelgroep:", p.url()); await axe("stap2");
await p.getByRole("link", { name: /Naar stap 3/ }).click(); await p.waitForURL(/stappen\/3/);
await p.getByRole("combobox", { name: "Doelgroep" }).click(); await p.getByRole("option", { name: `Expats ${R}` }).click();
await p.getByLabel("Wat zoekt, mist of wil deze doelgroep?").fill(`Nieuwe mensen leren kennen ${R}`);
await p.getByRole("button", { name: "Voeg een behoefte toe" }).click(); await main().getByText(`Nieuwe mensen leren kennen ${R}`).waitFor({ timeout: 15000 }); await axe("stap3");
await p.getByRole("link", { name: /Naar stap 4/ }).click(); await p.waitForURL(/stappen\/4/); await axe("stap4");
await p.getByRole("link", { name: "Voeg een idee toe" }).click(); await p.waitForURL(/ideeen\/nieuw/); await p.getByLabel("Hoe noem je jouw idee?").waitFor(); await axe("idee-nieuw");
await p.getByLabel("Hoe noem je jouw idee?").fill(`Verhalenwandeling ${R}`);
await p.getByLabel("Wat houdt het idee in?").fill("Een wandeling langs plekken met verhalen van Hagenaars, voor nieuwe internationale medewerkers.");
for (let i = 0; i < 5; i++) { const sub = p.getByRole("button", { name: "Deel je idee" }); if (await sub.isVisible()) { await sub.click(); break; } await p.getByRole("button", { name: /Volgende/ }).click(); }
await p.waitForURL(/stappen\/4/, { timeout: 15000 }); await main().getByText(`Verhalenwandeling ${R}`).first().waitFor(); console.log("terug op stap 4 na idee");
await p.getByRole("link", { name: /Naar stap 5/ }).click(); await p.waitForURL(/stappen\/5/);
await p.getByRole("combobox", { name: "Over welk idee?" }).click(); await p.getByRole("option", { name: `Verhalenwandeling ${R}` }).click();
await p.getByLabel("Toelichting").fill(`Bedrijven zoeken onboarding ${R}`);
await p.getByRole("button", { name: "Voeg een kans of bedreiging toe" }).click(); await main().getByText(`Bedrijven zoeken onboarding ${R}`).first().waitFor({ timeout: 15000 }); await axe("stap5");
await p.getByRole("link", { name: /Naar stap 6/ }).click(); await p.waitForURL(/stappen\/6/);
await p.getByRole("button", { name: "Bekijk en beoordeel de ideeën" }).click();
const row = main().getByRole("listitem").filter({ hasText: `Verhalenwandeling ${R}` });
await row.getByRole("button", { name: /Kies dit idee/ }).click();
await row.getByLabel("Wat zou de eerste vervolgstap kunnen zijn?").fill("Gesprek met een HR-afdeling");
await row.getByRole("button", { name: "Kies dit idee" }).click();
await row.getByText("Jouw eerste vervolgstap:").waitFor({ timeout: 15000 }); await axe("stap6");
await p.getByRole("link", { name: "Afronden" }).click(); await p.waitForURL(/bedankt/); await axe("bedankt");
await p.getByRole("link", { name: "Terug naar het overzicht" }).click(); await p.waitForURL(B + "/");
await main().getByText("Je hebt alle stappen doorlopen").waitFor({ timeout: 15000 }); await axe("overzicht");
const href = await main().getByRole("link", { name: `Verhalenwandeling ${R}` }).first().getAttribute("href");
await p.goto(B + href); await main().getByText(`Bedrijven zoeken onboarding ${R}`).waitFor(); await axe("idee-detail");
await p.setViewportSize({ width: 1280, height: 900 }); await p.goto(B + "/stappen/6"); await p.getByRole("heading", { name: "Van idee naar werkelijkheid" }).waitFor(); await axe("stap6-desktop");
await p.goto(B + "/"); await main().getByText("Je hebt alle stappen doorlopen").waitFor(); await axe("overzicht-desktop");
console.log("paginafouten:", errs.length ? errs : "geen");
await b.close();

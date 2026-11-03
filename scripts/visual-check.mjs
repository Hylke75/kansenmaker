/**
 * Visuele en toegankelijkheidscontrole van alle routes op mobiel, tablet en desktop.
 * Gebruik: start de app (npm run build && npm start) en draai
 *   node scripts/visual-check.mjs [basis-url] [uitvoermap]
 * Controleert: horizontaal scrollen, axe-core (WCAG 2.2 AA-regels) en maakt screenshots.
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const { AxeBuilder } = require("@axe-core/playwright");

const base = process.argv[2] ?? "http://localhost:3000";
const out = process.argv[3] ?? "qa-output";
mkdirSync(out, { recursive: true });

export const ROUTES = [
  ["overzicht", "/"],
  ["ideeen", "/ideeen"],
  ["idee-nieuw", "/ideeen/nieuw"],
  ["idee-detail", "/ideeen/i1"],
  ["doelgroepen", "/doelgroepen"],
  ["doelgroep-detail", "/doelgroepen/a2"],
  ["concepten", "/concepten"],
  ["concept-overzicht", "/concepten/c1"],
  ["concept-kansen", "/concepten/c1?tab=kansen"],
  ["concept-haalbaarheid", "/concepten/c1?tab=haalbaarheid"],
  ["concept-onderzoek", "/concepten/c1?tab=onderzoek"],
  ["concept-acties", "/concepten/c1?tab=acties"],
  ["realiteitstoets", "/concepten/c2/realiteitstoets"],
  ["sessies", "/sessies"],
  ["sessie-detail", "/sessies/s1"],
  ["begeleiden", "/sessies/s1/begeleiden"],
  ["sessieruimte", "/sessie/s1"],
  ["beheer", "/beheer"],
  ["beheer-gebruikers", "/beheer?tab=gebruikers"],
  ["beheer-instellingen", "/beheer?tab=instellingen"],
  ["print", "/beheer/print"],
  ["uitnodiging", "/uitnodiging/voorbeeld"],
  ["niet-gevonden", "/bestaat-niet"],
];

const VIEWPORTS = [
  ["mobiel", { width: 390, height: 844 }],
  ["tablet", { width: 820, height: 1180 }],
  ["desktop", { width: 1440, height: 900 }],
];

const browser = await chromium.launch();
const report = [];
for (const [vpName, viewport] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: "nl-NL" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  for (const [name, path] of ROUTES) {
    errors.length = 0;
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const axe = vpName === "mobiel" || vpName === "desktop"
      ? await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()
      : { violations: [] };
    await page.screenshot({ path: `${out}/${vpName}-${name}.png`, fullPage: true });
    report.push({
      viewport: vpName,
      route: path,
      horizontalOverflowPx: overflow,
      consoleErrors: [...errors],
      axe: axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes[0]?.target?.join(" ") })),
    });
  }
  await ctx.close();
}
await browser.close();
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
const problems = report.filter((r) => r.horizontalOverflowPx > 0 || r.consoleErrors.length || r.axe.length);
console.log(`${report.length} controles, ${problems.length} met bevindingen`);
for (const p of problems) console.log(JSON.stringify(p));

/**
 * Visuele en toegankelijkheidscontrole van alle routes op mobiel, tablet en desktop.
 * Logt in als testbeheerder (E2E_EMAIL / E2E_PASSWORD, zie docs/design-spec.md) en gebruikt
 * de nieuwste ideeën, doelgroepen, concepten en sessies uit het testproject.
 * Gebruik: start de app (npm run build && npm start) en draai
 *   E2E_PASSWORD=… node scripts/visual-check.mjs [basis-url] [uitvoermap]
 * Controleert: horizontaal scrollen, axe-core (WCAG 2.2 AA-regels) en maakt screenshots.
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const { AxeBuilder } = require("@axe-core/playwright");
const { createServerClient } = require("@supabase/ssr");

const base = process.argv[2] ?? "http://localhost:3000";
const out = process.argv[3] ?? "qa-output";
mkdirSync(out, { recursive: true });

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://taonpzydehufcqyouzyp.supabase.co";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_vbDuAgsT38aC8fLerGM4Ig_ZWCw1m3D";
const jar = new Map();
const db = createServerClient(SB_URL, SB_KEY, {
  cookies: {
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    setAll: (list) => list.forEach(({ name, value }) => jar.set(name, value)),
  },
});
const { error: loginError } = await db.auth.signInWithPassword({
  email: process.env.E2E_EMAIL ?? "e2e-beheer@kansenmaker.test",
  password: process.env.E2E_PASSWORD,
});
if (loginError) throw new Error(`Inloggen mislukt: ${loginError.message}`);
const latest = async (table) => (await db.from(table).select("id").order("created_at", { ascending: false }).limit(1)).data?.[0]?.id;
const [idea, audience, concept, session] = await Promise.all(["ideas", "audiences", "concepts", "sessions"].map(latest));
const cookies = [...jar].map(([name, value]) => ({ name, value, url: base }));

export const ROUTES = [
  ["inloggen", "/inloggen", { anon: true }],
  ["overzicht", "/"],
  ["ideeen", "/ideeen"],
  ["idee-nieuw", "/ideeen/nieuw"],
  ["idee-detail", `/ideeen/${idea}`],
  ["doelgroepen", "/doelgroepen"],
  ["doelgroep-detail", `/doelgroepen/${audience}`],
  ["concepten", "/concepten"],
  ["concept-overzicht", `/concepten/${concept}`],
  ["concept-kansen", `/concepten/${concept}?tab=kansen`],
  ["concept-haalbaarheid", `/concepten/${concept}?tab=haalbaarheid`],
  ["concept-onderzoek", `/concepten/${concept}?tab=onderzoek`],
  ["concept-acties", `/concepten/${concept}?tab=acties`],
  ["realiteitstoets", `/concepten/${concept}/realiteitstoets`],
  ["sessies", "/sessies"],
  ["sessie-detail", `/sessies/${session}`],
  ["begeleiden", `/sessies/${session}/begeleiden`],
  ["sessieruimte", `/sessie/${session}`],
  ["beheer", "/beheer"],
  ["beheer-gebruikers", "/beheer?tab=gebruikers"],
  ["beheer-instellingen", "/beheer?tab=instellingen"],
  ["print", "/beheer/print"],
  ["uitnodiging", "/uitnodiging/00000000-0000-0000-0000-000000000000", { anon: true }],
  ["niet-gevonden", "/bestaat-niet"],
];

const VIEWPORTS = [
  ["mobiel", { width: 390, height: 844 }],
  ["tablet", { width: 820, height: 1180 }],
  ["desktop", { width: 1440, height: 900 }],
];

const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
const browser = await chromium.launch(proxy ? { proxy: { server: proxy, bypass: "localhost,127.0.0.1" } } : {});
const report = [];
for (const [vpName, viewport] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: "nl-NL" });
  const anonCtx = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: "nl-NL" });
  await ctx.addCookies(cookies);
  const authPage = await ctx.newPage();
  const anonPage = await anonCtx.newPage();
  const errors = [];
  for (const pg of [authPage, anonPage]) {
    pg.on("pageerror", (e) => errors.push(e.message));
    pg.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  }
  for (const [name, path, opts] of ROUTES) {
    const page = opts?.anon ? anonPage : authPage;
    errors.length = 0;
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
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
  await anonCtx.close();
}
await browser.close();
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
const problems = report.filter((r) => r.horizontalOverflowPx > 0 || r.consoleErrors.length || r.axe.length);
console.log(`${report.length} controles, ${problems.length} met bevindingen`);
for (const p of problems) console.log(JSON.stringify(p));

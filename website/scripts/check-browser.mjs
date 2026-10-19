// Browser check: phone and desktop widths, no console errors, no horizontal overflow, agentprose's own tools work.
//   SITE_URL=http://localhost:4329/agentprose/ CHROME=/path/to/chrome node scripts/check-browser.mjs [screenshotDir]
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const u = new URL(process.env.SITE_URL || 'http://localhost:4329/agentprose/');
if (u.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(u.hostname)) u.protocol = 'https:';
const site = u.href.replace(/\/?$/, '/');
const shots = process.argv[2];
if (shots) mkdirSync(shots, { recursive: true });

const PAGES = ['', 'getting-started/', 'install/wordpress/', 'wordpress/', 'wordpress/settings/', 'concepts/tools/', 'guides/static-sites/', 'reference/configuration/',
  'reference/api/agentprose/functions/createagenttools/', 'support/', 'project/changelog/', 'no-such-page/'];
const VIEWPORTS = { phone: { width: 390, height: 844 }, desktop: { width: 1440, height: 900 } };

const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] });
let failures = 0;
for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: vpName === 'phone' ? 2 : 1, isMobile: vpName === 'phone' });
  for (const path of PAGES) {
    const page = await ctx.newPage();
    const problems = [];
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      if (path === 'no-such-page/' && /status of 404/.test(m.text())) return; // the 404 page's own response
      problems.push(`console: ${m.text()}`);
    });
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
    page.on('response', (r) => {
      if (r.status() >= 400 && r.url().startsWith(site) && !(path === 'no-such-page/' && r.url().endsWith('no-such-page/'))) problems.push(`HTTP ${r.status()} ${r.url()}`);
    });
    page.on('requestfailed', (r) => problems.push(`request failed: ${r.url()} ${r.failure()?.errorText}`));
    await page.goto(site + path, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    const m = await page.evaluate(() => ({
      title: document.title,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      h1: document.querySelector('h1')?.textContent?.trim(),
      tools: window.AgentProse?.instance?.tools?.length ?? 0,
    }));
    if (m.overflow > 1) problems.push(`horizontal overflow ${m.overflow}px`);
    if (!m.h1) problems.push('no h1');
    if (path === '' ) {
      const r = await page.evaluate(async () => {
        const ready = await window.AgentProse.instance.ready;
        const search = await window.AgentProse.instance.call('search_posts', { query: 'polyfill', limit: 3 });
        const listed = document.modelContext?.getTools ? (await document.modelContext.getTools()).length : -1;
        return { mode: ready.mode, registered: ready.registered.length, results: search.results?.map((x) => x.title), listed };
      });
      console.log(`  agentprose on this site: mode=${r.mode}, ${r.registered} registered, getTools=${r.listed}, search "polyfill" → ${JSON.stringify(r.results)}`);
      if (!r.registered || !r.results?.length) problems.push('agentprose tools did not work on the landing page');
      if (shots) await page.screenshot({ path: join(shots, `landing-${vpName}.png`) });
      // Theme toggle: the page must render in light mode too.
      await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
      if (shots) await page.screenshot({ path: join(shots, `landing-${vpName}-light.png`) });
    }
    console.log(`${problems.length ? '✘' : '✔'} ${vpName.padEnd(7)} /${path.padEnd(52)} ${m.title.slice(0, 60)} (${m.tools} tools)`);
    for (const p of problems) console.log(`    ${p}`);
    failures += problems.length;
    await page.close();
  }
  // The inspector opens without errors.
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push(e.message));
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
  await page.goto(site + 'concepts/tools/?agentprose-inspect', { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  const insp = await page.evaluate(() => !!document.querySelector('[id*="agentprose"], [class*="agentprose"]'));
  console.log(`${problems.length || !insp ? '✘' : '✔'} ${vpName.padEnd(7)} inspector (?agentprose-inspect) ${insp ? 'opened' : 'not found'}`);
  failures += problems.length + (insp ? 0 : 1);
  await ctx.close();
}
await browser.close();
console.log(failures ? `check-browser: ${failures} problem(s)` : 'check-browser: all clean');
process.exit(failures ? 1 : 0);

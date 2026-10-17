// Checks the published demo: native WebMCP tools on the live HTTPS site + screenshots.
// node test/e2e/live-check.mjs https://readmcp.sites.tab.bot/ /tmp/shots
import { chromium } from 'playwright-core';
const [url, out = '/tmp'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--enable-features=WebMCPTesting'] });
const res = {};
for (const [name, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const p = await b.newPage({ viewport: vp, deviceScaleFactor: name === 'mobile' ? 2 : 1 });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.waitForFunction(() => document.getElementById('readmcp-inspector')?.shadowRoot?.querySelector('details'));
  if (name === 'desktop') {
    res.tools = await p.evaluate(async () => (await document.modelContext.getTools()).map((t) => t.name));
    res.search = await p.evaluate(async () => { const t = (await document.modelContext.getTools()).find((x) => x.name === 'search_posts'); return JSON.parse(await document.modelContext.executeTool(t, { query: 'tokens' })).results.slice(0, 2).map((r) => r.url); });
    // run a tool in the inspector for the screenshot
    await p.evaluate(async () => {
      const root = document.getElementById('readmcp-inspector').shadowRoot;
      const d = root.querySelector('details[data-tool="search_posts"]');
      d.open = true;
      d.querySelector('input[name="query"]').value = 'markdown';
      d.querySelector('form').requestSubmit();
    });
    await p.waitForTimeout(1500);
  }
  await p.screenshot({ path: `${out}/demo-${name}.png` });
  if (name === 'mobile') {
    await p.evaluate(() => document.getElementById('readmcp-inspector').shadowRoot.querySelector('.btn').click());
    await p.screenshot({ path: `${out}/demo-mobile-closed.png` });
    await p.goto(url + 'posts/one-line-install/', { waitUntil: 'networkidle' });
    await p.screenshot({ path: `${out}/demo-mobile-post.png`, fullPage: false });
  }
  res[name + 'Errors'] = errs;
  await p.close();
}
console.log(JSON.stringify(res, null, 1));
await b.close();

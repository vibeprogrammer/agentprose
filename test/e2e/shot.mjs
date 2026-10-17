import { chromium } from 'playwright-core';
const [url, out, w, h, click] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--enable-features=WebMCPTesting'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
await p.goto(url, { waitUntil: 'networkidle' });
await p.waitForFunction(() => document.getElementById('agentprose-inspector')?.shadowRoot?.querySelector('details'));
if (click) { await p.click('[data-open-inspector]'); await p.waitForTimeout(300); }
await p.screenshot({ path: out });
await b.close();

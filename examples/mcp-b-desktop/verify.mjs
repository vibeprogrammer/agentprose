// End-to-end check of agentprose + MCP-B + the local relay, with no desktop app:
// a real MCP client (the official SDK) launches the relay over stdio exactly as Claude Desktop or
// Cursor would, a real Chromium (no native WebMCP) opens a blog page, and the client lists and
// calls the page's agentprose tools through the relay.
//
//   npm run build && node scripts/demo.mjs http://localhost:3000/      (in the repo root)
//   cd examples/mcp-b-desktop && npm install
//   CHROME=/path/to/chrome node verify.mjs [global|polyfill] [http|https]
// AGENTPROSE_DIST (default ../../dist) and SITE (default ../../demo/site) point at the build and the demo blog.
// For the https run, build the demo with https://blog.example/ as its base and add LNA=off.
//
// "global": the page loads @mcp-b/global. "polyfill": only agentprose, which loads the MCP-B polyfill
// by itself. "bookmarklet": only agentprose; the embed is added after load, as a reader's bookmarklet would. "https" serves the page as https://blog.example (a public
// origin) through request interception, to see what a real site does when it talks to localhost.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createRequire } from 'node:module';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright-core');
const MODE = process.argv[2] || 'global';
const ORIGIN = process.argv[3] || 'http';
const here = new URL('.', import.meta.url).pathname;
const DIST = process.env.AGENTPROSE_DIST || join(here, '../../dist');
const SITE = process.env.SITE || join(here, '../../demo/site');
const GLOBAL = 'https://cdn.jsdelivr.net/npm/@mcp-b/global@6.0.3/dist/index.iife.js';
const EMBED = 'https://cdn.jsdelivr.net/npm/@mcp-b/webmcp-local-relay@6.0.3/dist/browser/embed.js';
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown' };
const log = (...a) => console.log(new Date().toISOString().slice(11, 23), ...a);

function page(p) {
  let html = readFileSync(p, 'utf8');
  // agentprose from the local build; the MCP-B scripts from the CDN, as a real site would load them.
  html = html.replace(/<script src="\/agentprose\.min\.js"[^>]*><\/script>/, (tag) =>
    (MODE === 'global' ? `<script src="${GLOBAL}"></script>\n` : '') + tag.replace(' data-inspector', '') + (MODE === 'bookmarklet' ? '' : `\n<script src="${EMBED}" defer></script>`));
  return html;
}
function handler(path) {
  if (path.startsWith('/agentprose') && existsSync(join(DIST, path))) return { type: T['.js'], body: readFileSync(join(DIST, path)) };
  if (path.startsWith('/adapters/')) return { type: T['.js'], body: readFileSync(join(DIST, path)) };
  let p = join(SITE, decodeURIComponent(path));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!existsSync(p)) return null;
  return extname(p) === '.html' ? { type: T['.html'], body: page(p) } : { type: T[extname(p)] || 'application/octet-stream', body: readFileSync(p) };
}

const server = createServer((req, res) => {
  const r = handler(new URL(req.url, 'http://x').pathname);
  if (!r) return res.writeHead(404).end('not found');
  res.writeHead(200, { 'content-type': r.type }).end(r.body);
});
await new Promise((r) => server.listen(3000, '127.0.0.1', r));
const base = ORIGIN === 'https' ? 'https://blog.example/' : 'http://localhost:3000/';

// 1. The MCP client starts the relay over stdio (what claude_desktop_config.json does).
const transport = new StdioClientTransport({ command: process.execPath, args: [require.resolve('@mcp-b/webmcp-local-relay').replace(/index\.mjs$/, 'cli.mjs')], stderr: 'pipe' });
transport.stderr?.on('data', (d) => process.env.RELAY_LOG && process.stderr.write('[relay] ' + d));
const client = new Client({ name: 'agentprose-verify', version: '1.0.0' });
let changed = 0;
await client.connect(transport);
client.setNotificationHandler?.((await import('@modelcontextprotocol/sdk/types.js')).ToolListChangedNotificationSchema, () => void changed++);
const before = (await client.listTools()).tools.map((t) => t.name);
log('relay up; tools before any tab:', before.join(', '));

// 2. A browser with no native WebMCP opens a blog post.
const browser = await chromium.launch({ executablePath: process.env.CHROME, args: process.env.LNA === 'off' ? ['--disable-features=LocalNetworkAccessChecks'] : [] });
const ctx = await browser.newContext();
// LNA=off: a public https origin may reach the relay on localhost only after the visitor allows
// Chrome's Local Network Access prompt. Headless Chrome cannot click it, so LNA=off stands in for "Allow".
const pg = await ctx.newPage();
const errors = [];
pg.on('pageerror', (e) => errors.push(e.message));
pg.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()));
pg.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
if (ORIGIN === 'https') await pg.route('https://blog.example/**', (route) => {
  const r = handler(new URL(route.request().url()).pathname);
  return r ? route.fulfill({ status: 200, contentType: r.type, body: r.body }) : route.fulfill({ status: 404, body: 'not found' });
});
const url = base + (process.env.PAGE ?? 'posts/search-without-a-server/'); // PAGE='' with SITE=. checks index.html as published
await pg.goto(url);
const reg = await pg.evaluate(async () => {
  for (let i = 0; i < 100 && !window.AgentProse?.instance; i++) await new Promise((r) => setTimeout(r, 50));
  const r = await window.AgentProse.instance.ready;
  return { mode: r.mode, registered: r.registered.length, runtime: document.modelContext?.constructor?.name, polyfillTag: !!document.querySelector('script[src*="webmcp-polyfill"]') };
});
log('page:', url, JSON.stringify(reg));
// "bookmarklet": the page ships only agentprose; the reader adds the relay embed on demand (a bookmarklet,
// or a ?relay switch on the site), so ordinary visitors never probe localhost.
if (MODE === 'bookmarklet') await pg.evaluate((src) => document.head.appendChild(Object.assign(document.createElement('script'), { src })), EMBED);

// 3. Wait for the relay to see the tab's tools.
let tools = [];
for (let i = 0; i < 60; i++) {
  tools = (await client.listTools()).tools;
  if (tools.some((t) => /search_posts/.test(t.name))) break;
  await new Promise((r) => setTimeout(r, 500));
}
const names = tools.map((t) => t.name);
log('relay tools now:', names.join(', '));
const call = async (name, args = {}) => {
  const n = names.find((x) => x === name) || names.find((x) => x.startsWith(name));
  if (!n) return { missing: name };
  const r = await client.callTool({ name: n, arguments: args });
  return r.structuredContent || JSON.parse(r.content?.[0]?.text || 'null');
};
const sources = await client.callTool({ name: 'webmcp_list_sources', arguments: {} });
log('webmcp_list_sources:', (sources.content?.[0]?.text || '').slice(0, 400));
const art = await call('get_current_article');
log('get_current_article →', art?.title, '|', (art?.markdown || '').length, 'chars markdown,', art?.sections?.length, 'sections');
const s = await call('search_posts', { query: 'markdown for agents' });
log('search_posts →', (s?.results || []).slice(0, 3).map((r) => r.title).join(' | ') || JSON.stringify(s).slice(0, 300));
const p = await call('get_post', { slug: 'markdown-not-html' });
log('get_post →', p?.title || JSON.stringify(p).slice(0, 200));
const c = await call('get_citation', { url, quote: 'search' });
log('get_citation →', JSON.stringify(c).slice(0, 300));
log('toolListChanged notifications:', changed, '| page errors:', errors.length ? [...new Set(errors.map((e) => e.replace(/ws:\/\/[^/]+\//, 'ws://…/').replace(/connection to .* failed/, 'connection failed')))] : 'none');
const ok = names.some((x) => x.startsWith('search_posts')) && art?.title && (s?.results || []).length > 0;
log(ok ? 'PASS' : 'FAIL', `(${MODE}, ${ORIGIN})`);
await browser.close();
await client.close();
server.close();
process.exit(ok ? 0 : 1);

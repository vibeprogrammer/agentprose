// End-to-end tests in headless Chromium against fixture sites served locally.
// Run: CHROME=/path/to/chrome node --test test/e2e/   (CHROME optional when Playwright's browser is installed)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { serve } from './server.mjs';

const CHROME = process.env.CHROME || undefined;
let root, srv, base, native, plain, hasNative;
const needsNative = (t) => (hasNative ? false : (t.skip('this Chromium has no WebMCPTesting feature'), true));

before(async () => {
  root = mkdtempSync(join(tmpdir(), 'agentprose-e2e-'));
  srv = await serve(root, { wp: wpFixture() });
  base = `http://127.0.0.1:${srv.port}/`;
  execFileSync('node', ['scripts/demo.mjs', base], { env: { ...process.env, DEMO_OUT: root }, stdio: 'ignore' });
  // Fixture: a bare page with no feed, sitemap or llms.txt.
  mkdirSync(join(root, 'bare'), { recursive: true });
  writeFileSync(join(root, 'bare/index.html'), `<!doctype html><html lang="en"><head><title>Bare</title></head><body><main><h1>A bare page</h1><p>${'Just text. '.repeat(40)}</p><h2>Only section</h2><p>End.</p></main><script src="/agentprose.min.js" defer data-sitemap="false" data-llms="false"></script></body></html>`);
  // Fixture: a WordPress-like theme page (REST API mocked under /wp/wp-json/).
  mkdirSync(join(root, 'wp/hello-wordpress'), { recursive: true });
  writeFileSync(join(root, 'wp/hello-wordpress/index.html'), `<!doctype html><html><head><title>Hello WordPress</title><link rel="https://api.w.org/" href="${base}wp/wp-json/"><meta property="og:type" content="article"></head><body><article><h1 class="entry-title">Hello WordPress</h1><div class="entry-content"><p>${'Welcome to WordPress. '.repeat(20)}</p></div></article><script src="/agentprose.min.js" defer></script></body></html>`);
  // Fixture: CLI-indexed copy of the demo under /indexed/.
  const indexed = join(root, 'indexed');
  execFileSync('node', ['scripts/demo.mjs', base + 'indexed/'], { env: { ...process.env, DEMO_OUT: indexed }, stdio: 'ignore' });
  execFileSync('node', ['dist/cli.js', 'build', indexed, '--base-url', base + 'indexed/'], { stdio: 'ignore' });
  // A site under a sub-path tells agentprose where its root is.
  for (const f of ['posts/one-line-install/index.html']) {
    const p = join(indexed, f);
    writeFileSync(p, readFileSync(p, 'utf8').replace('data-inspector', `data-base="${base}indexed/" data-inspector`));
  }
  native = await chromium.launch({ executablePath: CHROME, args: ['--enable-features=WebMCPTesting'] });
  plain = await chromium.launch({ executablePath: CHROME });
  const probe = await native.newPage();
  await probe.goto(base + 'bare/');
  hasNative = await probe.evaluate(() => !!document.modelContext?.registerTool);
  await probe.close();
  console.log(`# browser ${native.version()} — native WebMCP ${hasNative ? 'available' : 'NOT available (native tests skipped)'}`);
});

after(async () => {
  await native?.close();
  await plain?.close();
  srv?.server.close();
});

async function open(browser, path) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const t0 = srv.log.length;
  await page.goto(base + path);
  await page.waitForFunction(() => window.AgentProse?.ready).then(() => page.evaluate(() => window.AgentProse.ready));
  return { page, errors, requests: () => srv.log.slice(t0) };
}

/** Calls a tool through the browser's own WebMCP implementation, as an agent would. */
const callNative = (page, name, input = {}) =>
  page.evaluate(async ([n, i]) => {
    const tools = await document.modelContext.getTools();
    const t = tools.find((x) => x.name === n);
    if (!t) throw new Error('no tool ' + n);
    return JSON.parse(await document.modelContext.executeTool(t, i));
  }, [name, input]);

test('native WebMCP: tools register on document.modelContext with schemas and annotations', async (t) => {
  if (needsNative(t)) return;
  const { page, errors } = await open(native, 'posts/one-line-install/');
  const tools = await page.evaluate(async () => (await document.modelContext.getTools()).map((t) => ({ name: t.name, ro: t.annotations?.readOnlyHint, untrusted: t.annotations?.untrustedContentHint, schema: t.inputSchema?.type })));
  assert.deepEqual(tools.map((t) => t.name), ['get_citation', 'get_current_article', 'get_post', 'get_related_posts', 'get_section', 'get_site_info', 'get_subscribe_link', 'get_table_of_contents', 'list_posts', 'list_taxonomies', 'search_posts']);
  assert.ok(tools.every((t) => t.ro === true && t.untrusted === true && t.schema === 'object'));
  const mode = await page.evaluate(async () => (await window.AgentProse.instance.ready).mode);
  assert.equal(mode, 'native');
  assert.deepEqual(errors, []);
});

test('page load fetches nothing beyond the script until an agent calls a site-wide tool', async (t) => {
  if (needsNative(t)) return;
  const { page, requests } = await open(native, 'posts/markdown-not-html/');
  await page.waitForTimeout(300);
  const loaded = requests().filter((r) => !r.includes('inspector'));
  assert.deepEqual(loaded, ['/posts/markdown-not-html/', '/agentprose.min.js']);
  await callNative(page, 'get_current_article');
  assert.deepEqual(requests().filter((r) => !r.includes('inspector')), loaded, 'current-article needs no network');
  await callNative(page, 'list_posts');
  assert.ok(requests().includes('/agentprose.index.min.js'));
  assert.ok(requests().includes('/feed.xml'));
});

test('get_current_article returns clean markdown, metadata and sections', async (t) => {
  if (needsNative(t)) return;
  const { page } = await open(native, 'posts/headless-cms-tokens/');
  const r = await callNative(page, 'get_current_article');
  assert.equal(r.title, 'Connecting a headless CMS: which tokens are safe in a page');
  assert.equal(r.isArticle, true);
  assert.deepEqual(r.authors, ['Maxim Salnikov']);
  assert.deepEqual(r.tags, ['cms', 'security', 'agentprose']);
  assert.equal(r.published, '2026-10-16T09:00:00.000Z');
  assert.deepEqual(r.sections.map((s) => s.title), ['Safe to embed', 'When you need a secret', 'Read-only by design']);
  assert.match(r.markdown, /- \*\*Ghost\*\*: the Content API key/);
  assert.doesNotMatch(r.markdown, /Share:|GitHub|agentprose demo blog/);
});

test('search_posts, list_posts and list_taxonomies cover the whole site from feed + sitemap + llms.txt', async (t) => {
  if (needsNative(t)) return;
  const { page } = await open(native, '');
  const s = await callNative(page, 'search_posts', { query: 'which tokens are safe' });
  assert.equal(s.results[0].url, base + 'posts/headless-cms-tokens/');
  const l = await callNative(page, 'list_posts', { limit: 10 });
  assert.equal(l.total, 7, 'six posts plus the about page from the sitemap');
  assert.equal(l.items[0].title, 'Measuring agent traffic with onToolCall');
  const older = l.items.find((p) => p.url.endsWith('/what-webmcp-means-for-blogs/'));
  assert.equal(older.title, 'What WebMCP means for blogs', 'sitemap-only post got its title from llms.txt');
  const tagged = await callNative(page, 'list_posts', { tag: 'security' });
  assert.deepEqual(tagged.items.map((p) => p.url), [base + 'posts/headless-cms-tokens/']);
  const tax = await callNative(page, 'list_taxonomies', { type: 'tags' });
  assert.ok(tax.tags.find((x) => x.name === 'agentprose').count >= 2);
});

test('get_post fetches a post that is not in the feed, and get_section / get_table_of_contents work on it', async (t) => {
  if (needsNative(t)) return;
  const { page } = await open(native, '');
  const p = await callNative(page, 'get_post', { url: '/posts/what-webmcp-means-for-blogs/' });
  assert.equal(p.title, 'What WebMCP means for blogs');
  assert.match(p.markdown, /```js\nawait document\.modelContext\.registerTool/);
  const toc = await callNative(page, 'get_table_of_contents', { slug: 'what-webmcp-means-for-blogs' });
  assert.deepEqual(toc.sections.map((s) => s.id), ['tools-instead-of-scraping', 'what-a-blog-should-offer', 'where-browsers-are']);
  const sec = await callNative(page, 'get_section', { url: '/posts/what-webmcp-means-for-blogs/', section: 'where-browsers-are' });
  assert.match(sec.markdown, /^## Where browsers are/);
  const missing = await callNative(page, 'get_post', { slug: 'does-not-exist' });
  assert.equal(missing.error, 'not_found');
});

test('get_related_posts and get_site_info', async (t) => {
  if (needsNative(t)) return;
  const { page } = await open(native, 'posts/what-webmcp-means-for-blogs/');
  const r = await callNative(page, 'get_related_posts', {});
  assert.ok(r.related.length >= 2);
  assert.ok(r.related.every((x) => !x.url.endsWith('/what-webmcp-means-for-blogs/')));
  const info = await callNative(page, 'get_site_info');
  assert.equal(info.name, 'agentprose demo blog');
  assert.equal(info.lang, 'en');
  assert.ok(info.postCount >= 6);
  assert.equal(info.links.subscribe, base + 'feed.xml');
});

test('browsers without WebMCP: no errors, tools still callable through window.AgentProse', async () => {
  const { page, errors } = await open(plain, 'posts/search-without-a-server/');
  const r = await page.evaluate(async () => {
    const reg = await window.AgentProse.instance.ready;
    const art = await window.AgentProse.instance.call('get_current_article');
    return { has: 'modelContext' in document, mode: reg.mode, title: art.title };
  });
  assert.deepEqual(r, { has: false, mode: 'none', title: 'Search without a server' });
  assert.deepEqual(errors, []);
});

test('inspector panel lists the tools and runs one', async () => {
  const { page } = await open(plain, '?agentprose-inspect');
  await page.waitForFunction(() => document.getElementById('agentprose-inspector')?.shadowRoot?.querySelectorAll('details').length > 5);
  const out = await page.evaluate(async () => {
    const root = document.getElementById('agentprose-inspector').shadowRoot;
    const d = root.querySelector('details[data-tool="search_posts"]');
    d.open = true;
    d.querySelector('input[name="query"]').value = 'markdown';
    d.querySelector('form').requestSubmit();
    for (let i = 0; i < 50 && !d.querySelector('pre'); i++) await new Promise((r) => setTimeout(r, 50));
    return { count: root.querySelectorAll('details').length, text: d.querySelector('pre')?.textContent };
  });
  assert.equal(out.count, 11);
  assert.match(out.text, /Why agents should get markdown, not HTML/);
});

test('bare page without feeds: current-article tools work and site-wide tools degrade gracefully', async (t) => {
  if (needsNative(t)) return;
  const { page, errors } = await open(native, 'bare/');
  const a = await callNative(page, 'get_current_article');
  assert.equal(a.title, 'A bare page');
  assert.equal(a.sections[0].title, 'Only section');
  const l = await callNative(page, 'list_posts');
  assert.equal(l.error, undefined);
  assert.ok(Array.isArray(l.items));
  assert.deepEqual(errors, []);
});

test('WordPress: auto-detects the REST API, loads the adapter and searches server-side', async (t) => {
  if (needsNative(t)) return;
  const { page, errors } = await open(native, 'wp/hello-wordpress/');
  const s = await callNative(page, 'search_posts', { query: 'blocks' });
  assert.deepEqual(s.results.map((r) => r.title), ['Working with blocks']);
  const l = await callNative(page, 'list_posts', { tag: 'webmcp' });
  assert.deepEqual(l.items.map((r) => r.title), ['WebMCP on WordPress']);
  const p = await callNative(page, 'get_post', { slug: 'working-with-blocks' });
  assert.match(p.markdown, /## Blocks 101/);
  assert.ok(srv.log.some((r) => r.startsWith('/adapters/wordpress.min.js')));
  assert.ok(srv.log.some((r) => r.startsWith('/wp/wp-json/wp/v2/posts') && r.includes('search=blocks')));
  assert.deepEqual(errors, []);
});

test('CLI-built index: agentprose.json answers search and post bodies load from markdown shards', async (t) => {
  if (needsNative(t)) return;
  const t0 = srv.log.length;
  const { page } = await open(native, 'indexed/posts/one-line-install/');
  const s = await callNative(page, 'search_posts', { query: 'pagefind' });
  assert.equal(s.results[0].url, base + 'indexed/posts/search-without-a-server/');
  const p = await callNative(page, 'get_post', { slug: 'search-without-a-server' });
  assert.match(p.markdown, /BM25F ranker/);
  const reqs = srv.log.slice(t0);
  assert.ok(reqs.includes('/indexed/agentprose.json'));
  assert.ok(reqs.includes('/indexed/agentprose/posts/posts/search-without-a-server.md'));
  assert.ok(!reqs.some((r) => r.endsWith('sitemap.xml')), 'no sitemap crawl when an index exists');
});

test('opt-in MCP-B polyfill (data-polyfill) supplies document.modelContext in browsers without WebMCP', async (t) => {
  const online = await fetch('https://unpkg.com/@mcp-b/webmcp-polyfill@6.0.3/package.json').then((r) => r.ok).catch(() => false);
  if (!online) return t.skip('offline: polyfill CDN unreachable');
  mkdirSync(join(root, 'poly'), { recursive: true });
  writeFileSync(join(root, 'poly/index.html'), `<!doctype html><html><head><title>Poly</title><meta property="og:type" content="article"></head><body><article><h1>Polyfilled</h1><p>${'Text. '.repeat(30)}</p></article><script src="/agentprose.min.js" defer data-polyfill data-sitemap="false" data-llms="false"></script></body></html>`);
  const { page, errors } = await open(plain, 'poly/');
  const r = await page.evaluate(async () => {
    const reg = await window.AgentProse.instance.ready;
    const mc = document.modelContext;
    let viaPolyfill = null;
    if (mc?.getTools && mc?.executeTool) {
      const tools = await mc.getTools();
      const t = tools.find((x) => x.name === 'get_current_article');
      viaPolyfill = t ? JSON.parse(await mc.executeTool(t, {})).title : null;
    }
    return { mode: reg.mode, registered: reg.registered.length, viaPolyfill };
  });
  assert.equal(r.mode, 'native');
  assert.ok(r.registered >= 9);
  if (r.viaPolyfill !== null) assert.equal(r.viaPolyfill, 'Polyfilled');
  assert.deepEqual(errors, []);
});

function wpFixture() {
  const post = (id, slug, title, html, tags) => ({ id, slug, link: `http://wp.local/${slug}/`, title: { rendered: title }, excerpt: { rendered: `<p>${title} excerpt</p>` }, content: { rendered: html }, date_gmt: `2026-10-0${id}T10:00:00`, modified_gmt: `2026-10-0${id}T10:00:00`, author: 1, tags, categories: [1] });
  return {
    name: 'WP Fixture',
    description: 'A mocked WordPress',
    url: 'http://wp.local',
    tags: [{ id: 5, name: 'WebMCP', slug: 'webmcp', count: 1 }, { id: 6, name: 'Editor', slug: 'editor', count: 1 }],
    categories: [{ id: 1, name: 'Uncategorized', slug: 'uncategorized', count: 2 }],
    users: [{ id: 1, name: 'admin', slug: 'admin' }],
    posts: [post(2, 'webmcp-on-wordpress', 'WebMCP on WordPress', '<p>Agents meet WordPress.</p>', [5]), post(1, 'working-with-blocks', 'Working with blocks', '<h2>Blocks 101</h2><p>Gutenberg blocks.</p>', [6])],
  };
}

// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DOMParser as LDOM } from 'linkedom';
import { autoSource, filterPosts, aggregate } from '../../src/core/source';
import { html, mockFetch } from './helpers';

// Feeds and sitemaps are XML; parse them with linkedom inside happy-dom (see feeds.test.ts).
const HD = globalThis.DOMParser;
class Mixed {
  parseFromString(s: string, t: DOMParserSupportedType) {
    return t === 'text/html' ? new HD().parseFromString(s, t) : (new (LDOM as any)().parseFromString(s, t) as Document);
  }
}

const B = 'https://ex.com/';
const RSS = `<?xml version="1.0"?><rss version="2.0"><channel>
<item><title>Newest post</title><link>https://ex.com/posts/newest/</link><pubDate>Fri, 16 Oct 2026 09:00:00 GMT</pubDate><category>webmcp</category><description>Newest summary</description></item>
<item><title>Older post</title><link>https://ex.com/posts/older/</link><pubDate>Thu, 01 Oct 2026 09:00:00 GMT</pubDate><category>pwa</category><description>Older summary</description></item>
</channel></rss>`;
const SITEMAP = `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>https://ex.com/</loc></url><url><loc>https://ex.com/posts/newest/</loc></url><url><loc>https://ex.com/posts/older/</loc></url>
<url><loc>https://ex.com/posts/archived-gem/</loc><lastmod>2025-01-01</lastmod></url><url><loc>https://ex.com/tags/webmcp/</loc></url><url><loc>https://other.com/x/</loc></url></urlset>`;
const LLMS = '# Ex Blog\n\n> A blog.\n\n## Posts\n\n- [The archived gem](https://ex.com/posts/archived-gem/): An old classic\n';
const GEM = `<html><head><title>Gem</title><meta property="og:type" content="article"></head><body><article><h1>The archived gem</h1><h2>Part one</h2><p>${'Words. '.repeat(40)}</p></article></body></html>`;

beforeEach(() => {
  (globalThis as any).DOMParser = Mixed;
  sessionStorage.clear();
});

describe('autoSource', () => {
  it('merges feed + sitemap + llms.txt, skips listings and other origins, fetches nothing until asked', async () => {
    const m = mockFetch({ '/index.xml': RSS, '/sitemap.xml': SITEMAP, '/llms.txt': LLMS, '/posts/archived-gem/': GEM });
    vi.stubGlobal('fetch', m.fetch);
    const doc = html('<html><head><link rel="alternate" type="application/rss+xml" href="/index.xml"></head><body></body></html>');
    const src = autoSource({}, doc, B);
    expect(m.calls).toHaveLength(0);
    const { items, total } = await src.list();
    expect(total).toBe(3);
    expect(items.map((p) => p.url)).toEqual(['https://ex.com/posts/newest/', 'https://ex.com/posts/older/', 'https://ex.com/posts/archived-gem/']);
    expect(items[2]).toMatchObject({ title: 'The archived gem', summary: 'An old classic' });
    expect(m.calls.map((c) => new URL(c.url).pathname)).toEqual(['/agentprose.json', '/index.xml', '/sitemap.xml', '/llms.txt']);
    // get() on a sitemap-only post fetches and extracts the page
    const gem = await src.get({ slug: 'archived-gem' });
    expect(gem?.markdown).toContain('## Part one');
    expect(await src.get({ url: 'https://other.com/x/' })).toBeNull();
    vi.unstubAllGlobals();
  });

  it('prefers a prebuilt agentprose.json and loads sharded markdown on demand', async () => {
    const idx = { version: 1, site: { name: 'Indexed' }, posts: [{ url: '/a/', title: 'A', text: 'alpha', md: '/agentprose/posts/a.md' }] };
    const m = mockFetch({ '/agentprose.json': idx, '/agentprose/posts/a.md': '# A\n\nalpha body' });
    vi.stubGlobal('fetch', m.fetch);
    const src = autoSource({}, html('<html><body></body></html>'), B);
    const { items } = await src.list();
    expect(items[0].url).toBe('https://ex.com/a/');
    expect((await src.site!()).name).toBe('Indexed');
    expect((await src.get({ url: '/a/' }))?.markdown).toContain('alpha body');
    expect(m.calls.some((c) => c.url.includes('sitemap'))).toBe(false);
    vi.unstubAllGlobals();
  });

  it('caches the corpus in sessionStorage', async () => {
    const m = mockFetch({ '/feed.json': { version: 'https://jsonfeed.org/version/1.1', items: [{ url: '/x/', title: 'X' }] } });
    vi.stubGlobal('fetch', m.fetch);
    const doc = html('<html><body></body></html>');
    await autoSource({ sitemap: false, llmsTxt: false }, doc, B).list();
    const n = m.calls.length;
    const again = await autoSource({ sitemap: false, llmsTxt: false }, doc, B).list();
    expect(again.items[0].title).toBe('X');
    expect(m.calls.length).toBe(n);
    vi.unstubAllGlobals();
  });
});

describe('filterPosts and aggregate', () => {
  const ps = [
    { url: 'a', title: 'A', tags: ['X'], authors: ['Ada'], published: '2026-10-03' },
    { url: 'b', title: 'B', tags: ['x', 'y'], categories: ['News'], published: '2026-10-01' },
    { url: 'c', title: 'C', published: '2026-09-01' },
  ];
  it('filters case-insensitively, by date range, sorts and pages', () => {
    expect(filterPosts(ps, { tag: 'x' }).items.map((p) => p.url)).toEqual(['a', 'b']);
    expect(filterPosts(ps, { since: '2026-10-01' }).total).toBe(2);
    expect(filterPosts(ps, { sort: 'oldest', limit: 1 }).items[0].url).toBe('c');
    expect(filterPosts(ps, { offset: 1, limit: 1 })).toEqual({ items: [ps[1]], total: 3 });
  });
  it('counts taxonomies, most used first', () => {
    const t = aggregate(ps);
    expect(t.tags[0]).toEqual({ name: 'X', count: 2 });
    expect(t.categories).toEqual([{ name: 'News', count: 1 }]);
    expect(t.authors).toEqual([{ name: 'Ada', count: 1 }]);
  });
});

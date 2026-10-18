import { describe, it, expect } from 'vitest';
import { extractPage, extractSite, findBody, jsonLd, toc, section } from '../../src/core/extract';
import { html } from './helpers';

const PAGE = `<!doctype html><html lang="nb"><head>
<title>Hello | Blog</title>
<link rel="canonical" href="https://ex.com/posts/hello/">
<meta name="description" content="Meta description">
<meta property="og:site_name" content="Ex Blog">
<link rel="alternate" type="application/rss+xml" href="/index.xml">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebSite","name":"Ex","url":"https://ex.com/"},{"@type":["BlogPosting"],"headline":"Hello world","datePublished":"2026-10-01","author":[{"@type":"Person","name":"Ada"}],"keywords":"a, b","articleSection":"News","image":{"url":"/img.png"}}]}</script>
<script type="application/ld+json">{ broken json </script>
</head><body>
<header><nav><a href="/">Home</a></nav></header>
<main><article><h1>Hello world</h1><div class="entry-content"><p>${'Intro text. '.repeat(30)}</p><h2>Setup</h2><p>Do this.</p><h3>Details</h3><p>More.</p><h2>Usage</h2><p>Use it.</p><div class="share">Share me</div></div></article></main>
<aside>Sidebar</aside><footer>Footer</footer>
</body></html>`;

describe('extractPage', () => {
  const p = extractPage(html(PAGE), 'https://ex.com/posts/hello/?utm=1');
  it('reads JSON-LD through @graph and tolerates broken blocks', () => {
    expect(jsonLd(html(PAGE)).length).toBe(3);
    expect(p.title).toBe('Hello world');
    expect(p.authors).toEqual(['Ada']);
    expect(p.tags).toEqual(['a', 'b']);
    expect(p.categories).toEqual(['News']);
    expect(p.published).toBe('2026-10-01T00:00:00.000Z');
    expect(p.image).toBe('https://ex.com/img.png');
    expect(p.isArticle).toBe(true);
  });
  it('uses the canonical URL and page language', () => {
    expect(p.url).toBe('https://ex.com/posts/hello/');
    expect(p.slug).toBe('hello');
    expect(p.lang).toBe('nb');
  });
  it('extracts only the article body, without chrome or share widgets', () => {
    expect(p.markdown).toContain('## Setup');
    expect(p.markdown).not.toContain('Sidebar');
    expect(p.markdown).not.toContain('Footer');
    expect(p.markdown).not.toContain('Share me');
    expect(p.markdown).not.toContain('Home');
  });
  it('falls back to OpenGraph and <article> without JSON-LD', () => {
    const d = html(`<html><head><meta property="og:title" content="OG T"><meta property="og:type" content="article"><meta property="article:published_time" content="2026-01-02T03:04:05Z"><meta property="article:tag" content="x"></head><body><article><p>${'Body. '.repeat(50)}</p></article></body></html>`);
    const r = extractPage(d, 'https://ex.com/a/');
    expect(r.title).toBe('OG T');
    expect(r.isArticle).toBe(true);
    expect(r.tags).toEqual(['x']);
    expect(r.published).toBe('2026-01-02T03:04:05.000Z');
  });
  it('picks the dominant <article> on a page with several', () => {
    const d = html(`<body><article><p>short</p></article><article><p>${'long text '.repeat(200)}</p></article><article><p>short</p></article></body>`);
    expect(findBody(d)?.textContent).toContain('long text');
  });
  it('honours an explicit content selector', () => {
    const d = html('<body><div id="x"><p>chosen</p></div><article><p>other</p></article></body>');
    expect(extractPage(d, 'https://ex.com/', { selector: '#x' }).markdown).toBe('chosen');
  });
});

describe('extractSite', () => {
  it('reads site name, feeds and generator', () => {
    const s = extractSite(html(PAGE), 'https://ex.com/posts/hello/');
    expect(s.name).toBe('Ex');
    expect(s.feeds).toEqual(['https://ex.com/index.xml']);
    expect(s.url).toBe('https://ex.com/');
  });
});

describe('toc and section', () => {
  const md = '# A\n\ntext\n\n## B\n\nb text\n\n```\n## not a heading\n```\n\n### C\n\nc\n\n## B\n\nsecond b\n\n## D\n\nd';
  it('builds an outline with unique ids and skips fenced code', () => {
    const t = toc(md);
    expect(t.map((x) => x.id)).toEqual(['a', 'b', 'c', 'b-1', 'd']);
    expect(t.map((x) => x.level)).toEqual([1, 2, 3, 2, 2]);
  });
  it('returns a section with its subsections, up to the next sibling', () => {
    const s = section(md, 'b')!;
    expect(s.markdown).toContain('### C');
    expect(s.markdown).not.toContain('second b');
    expect(section(md, 'b-1')!.markdown).toContain('second b');
    expect(section(md, 'D')!.markdown).toBe('## D\n\nd');
    expect(section(md, 'nope')).toBeNull();
  });
});

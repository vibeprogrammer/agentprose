import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createAgentTools } from '../../src/index';
import { staticAdapter } from '../../src/adapters/generic';
import type { Post } from '../../src/core/types';

const long = Array.from({ length: 60 }, (_, i) => `Paragraph ${i} ${'lorem ipsum '.repeat(20)}`).join('\n\n');
const posts: Post[] = [
  { url: 'https://ex.com/posts/webmcp-intro/', slug: 'webmcp-intro', title: 'WebMCP intro', tags: ['webmcp'], authors: ['Ada'], categories: ['Guides'], published: '2026-10-10T00:00:00Z', summary: 'Start here', markdown: '## Why\n\nBecause.\n\n## How\n\nLike this.\n\n### Details\n\nFine print.' },
  { url: 'https://ex.com/posts/webmcp-security/', slug: 'webmcp-security', title: 'WebMCP security', tags: ['webmcp', 'security'], authors: ['Bo'], published: '2026-10-12T00:00:00Z', summary: 'Stay safe', markdown: long },
  { url: 'https://ex.com/posts/pwa/', slug: 'pwa', title: 'Service workers', tags: ['pwa'], authors: ['Ada'], published: '2026-09-01T00:00:00Z', summary: 'Offline', markdown: 'Caches.' },
];

beforeEach(() => {
  document.head.innerHTML = '<title>Current</title><meta property="og:type" content="article"><script type="application/ld+json">{"@type":"BlogPosting","headline":"Current post","author":{"name":"Cy"},"datePublished":"2026-10-15"}</script>';
  document.body.innerHTML = `<nav>menu</nav><article><h1>Current post</h1><p>Intro.</p><h2>First part</h2><p>One.</p><h2>Second part</h2><p>Two.</p></article>`;
});

const make = (extra = {}) => createAgentTools({ adapter: staticAdapter(posts), register: false, ...extra });

describe('built-in tools', () => {
  it('registers the documented tool set with schemas and read-only annotations', () => {
    const t = make().tools;
    expect(t.map((x) => x.name)).toEqual(['get_current_article', 'search_posts', 'list_posts', 'get_post', 'list_taxonomies', 'get_related_posts', 'get_table_of_contents', 'get_section', 'get_citation', 'get_site_info']);
    for (const x of t) {
      expect(x.description.length).toBeGreaterThan(40);
      expect(x.inputSchema?.type).toBe('object');
      expect(x.annotations).toEqual({ readOnlyHint: true, untrustedContentHint: true });
    }
  });
  it('get_current_article returns markdown, metadata and sections of the page', async () => {
    const r: any = await make().call('get_current_article');
    expect(r).toMatchObject({ title: 'Current post', authors: ['Cy'], isArticle: true, truncated: false });
    expect(r.markdown).toContain('## First part');
    expect(r.markdown).not.toContain('menu');
    expect(r.sections.map((s: any) => s.id)).toEqual(['first-part', 'second-part']);
  });
  it('search_posts ranks across the site and honours filters', async () => {
    const i = make();
    const r: any = await i.call('search_posts', { query: 'webmcp security' });
    expect(r.results[0].url).toBe('https://ex.com/posts/webmcp-security/');
    const f: any = await i.call('search_posts', { query: 'webmcp', author: 'ada' });
    expect(f.results.map((x: any) => x.url)).toEqual(['https://ex.com/posts/webmcp-intro/']);
    expect(await i.call('search_posts', {})).toMatchObject({ error: 'invalid_input' });
  });
  it('list_posts pages newest first and filters by tag', async () => {
    const r: any = await make().call('list_posts', { limit: 2 });
    expect(r.items.map((x: any) => x.title)).toEqual(['WebMCP security', 'WebMCP intro']);
    expect(r).toMatchObject({ total: 3, next_offset: 2 });
    expect(((await make().call('list_posts', { tag: 'pwa' })) as any).items).toHaveLength(1);
    expect(r.items[0].markdown).toBeUndefined();
  });
  it('get_post pages long posts at paragraph boundaries without losing text', async () => {
    const i = make();
    const a: any = await i.call('get_post', { slug: 'webmcp-security', max_chars: 2000 });
    expect(a.truncated).toBe(true);
    expect(a.markdown.length).toBeLessThanOrEqual(2000);
    let all = a.markdown;
    let next = a.next_offset;
    while (next !== undefined) {
      const b: any = await i.call('get_post', { slug: 'webmcp-security', max_chars: 2000, offset: next });
      all += b.markdown;
      next = b.next_offset;
    }
    expect(all).toBe(long);
  });
  it('get_post and get_section return one section; unknown posts are structured errors', async () => {
    const i = make();
    const s: any = await i.call('get_post', { url: '/posts/webmcp-intro/', section: 'how' });
    expect(s.markdown).toBe('## How\n\nLike this.\n\n### Details\n\nFine print.');
    const g: any = await i.call('get_section', { section: 'Second part' });
    expect(g.markdown).toBe('## Second part\n\nTwo.');
    expect(await i.call('get_post', { slug: 'nope' })).toMatchObject({ error: 'not_found' });
    expect(await i.call('get_section', { section: 'zzz' })).toMatchObject({ error: 'section_not_found' });
  });
  it('get_table_of_contents, list_taxonomies and get_related_posts', async () => {
    const i = make();
    expect(((await i.call('get_table_of_contents', { slug: 'webmcp-intro' })) as any).sections.map((s: any) => s.title)).toEqual(['Why', 'How', 'Details']);
    const t: any = await i.call('list_taxonomies');
    expect(t.tags[0]).toMatchObject({ name: 'webmcp', count: 2 });
    expect(t.authors[0]).toMatchObject({ name: 'Ada', count: 2 });
    expect(((await i.call('list_taxonomies', { type: 'tags' })) as any).authors).toBeUndefined();
    const rel: any = await i.call('get_related_posts', { slug: 'webmcp-intro' });
    expect(rel.related[0].url).toBe('https://ex.com/posts/webmcp-security/');
  });
  it('get_citation formats a citation and verifies quotes with a text-fragment link', async () => {
    const i = make();
    const ok: any = await i.call('get_citation', { slug: 'webmcp-intro', quote: 'Like this.' });
    expect(ok.citation).toBe('Ada (2026). WebMCP intro. https://ex.com/posts/webmcp-intro/');
    expect(ok.found).toBe(true);
    expect(ok.quoteUrl).toBe('https://ex.com/posts/webmcp-intro/#:~:text=Like%20this.');
    const bad: any = await i.call('get_citation', { slug: 'webmcp-intro', quote: 'never said this' });
    expect(bad.found).toBe(false);
    expect(bad.quoteUrl).toBeUndefined();
  });
  it('get_site_info reports counts, latest post and links', async () => {
    const r: any = await make({ links: { subscribe: 'https://ex.com/newsletter' } }).call('get_site_info');
    expect(r).toMatchObject({ postCount: 3, latestPost: '2026-10-12T00:00:00Z', contentSource: 'static', links: { subscribe: 'https://ex.com/newsletter' } });
  });
  it('supports prefix, exclude, custom tools, action links and navigate_to', async () => {
    const i = make({ prefix: 'blog_', exclude: ['get_site_info'], links: { subscribe: 'https://ex.com/s', comments: 'https://ex.com/c?u={url}' }, navigate: true, tools: [{ name: 'hello', description: 'Says hello to whoever asks, for testing custom tools.', execute: () => ({ hi: true }) }] });
    const names = i.tools.map((t) => t.name);
    expect(names).toContain('blog_search_posts');
    expect(names).toContain('blog_get_subscribe_link');
    expect(names).toContain('blog_navigate_to');
    expect(names).toContain('blog_hello');
    expect(names).not.toContain('blog_get_site_info');
    expect(await i.call('hello')).toEqual({ hi: true });
    expect(await i.call('blog_navigate_to', { url: 'https://evil.com/' })).toMatchObject({ error: 'invalid_input' });
    expect(((await i.call('get_comments_link')) as any).url).toContain('https://ex.com/c?u=');
    expect(await i.call('nope')).toMatchObject({ error: 'unknown_tool' });
  });
  it('reports every call to onToolCall and as a DOM event, and turns throws into results', async () => {
    const events: any[] = [];
    const dom: any[] = [];
    document.addEventListener('readmcp:call', (e: any) => dom.push(e.detail));
    const i = make({ onToolCall: (e: any) => events.push(e), tools: [{ name: 'boom', description: 'Always throws, to test error handling in tools.', execute: () => { throw new Error('kaput'); } }] });
    await i.call('list_posts');
    expect(await i.call('boom')).toEqual({ error: 'tool_failed', message: 'kaput' });
    expect(events.map((e) => [e.tool, e.ok])).toEqual([['list_posts', true], ['boom', false]]);
    expect(dom).toHaveLength(2);
  });
});

import { describe, it, expect } from 'vitest';
import { wordpress } from '../../src/adapters/wordpress';
import { ghost } from '../../src/adapters/ghost';
import { sanity } from '../../src/adapters/sanity';
import { contentful } from '../../src/adapters/contentful';
import { enonic } from '../../src/adapters/enonic';
import { strapi } from '../../src/adapters/strapi';
import { storyblok } from '../../src/adapters/storyblok';
import { staticAdapter, defineAdapter } from '../../src/adapters/generic';
import { guardToken, via } from '../../src/adapters/_shared';
import { portableText, contentfulRichText, proseMirror, strapiBlocks } from '../../src/adapters/_render';
import { mockFetch } from './helpers';

describe('wordpress', () => {
  const wp = mockFetch({
    'https://wp.ex/wp-json/wp/v2/tags': [{ id: 7, name: 'WebMCP', slug: 'webmcp', link: 'https://wp.ex/tag/webmcp/', count: 4 }],
    'https://wp.ex/wp-json/wp/v2/categories': [{ id: 1, name: 'News', slug: 'news', count: 9 }],
    'https://wp.ex/wp-json/wp/v2/users': [{ id: 2, name: 'Ada', slug: 'ada' }],
    'https://wp.ex/wp-json/wp/v2/posts': (u: URL) => [
      { id: 11, link: 'https://wp.ex/hello/', slug: 'hello', title: { rendered: 'Hello &amp; welcome' }, excerpt: { rendered: '<p>Intro [&hellip;]</p>' }, content: { rendered: '<h2>Part</h2><p>Body</p>' }, date_gmt: '2026-10-01T10:00:00', modified_gmt: '2026-10-02T10:00:00', author: 2, tags: [7], categories: [1] },
    ].filter(() => !u.searchParams.get('slug') || u.searchParams.get('slug') === 'hello'),
  });
  const a = wordpress({ api: 'https://wp.ex/wp-json/', fetch: wp.fetch });
  it('lists posts with resolved terms and the X-WP-Total count', async () => {
    const r = await a.list({ tag: 'webmcp', limit: 5 });
    expect(r.total).toBe(3);
    expect(r.items[0]).toMatchObject({ title: 'Hello & welcome', tags: ['WebMCP'], categories: ['News'], authors: ['Ada'], published: '2026-10-01T10:00:00.000Z' });
    const u = new URL(wp.calls.find((c) => c.url.includes('/posts'))!.url);
    expect(u.searchParams.get('tags')).toBe('7');
    expect(u.searchParams.get('per_page')).toBe('5');
  });
  it('searches with the native search param and gets a post by slug', async () => {
    await a.search!('hello');
    expect(wp.calls.some((c) => new URL(c.url).searchParams.get('search') === 'hello')).toBe(true);
    const p = await a.get({ url: 'https://wp.ex/hello/' });
    expect(p?.html).toContain('<h2>Part</h2>');
  });
  it('returns nothing for an unknown tag instead of everything', async () => {
    expect((await a.list({ tag: 'missing' })).items).toEqual([]);
  });
  it('supports ?rest_route= sites without pretty permalinks', async () => {
    const m = mockFetch({ 'https://wp.ex/?': [] });
    await wordpress({ api: 'https://wp.ex/?rest_route=/', fetch: m.fetch }).list();
    expect(m.calls.some((c) => new URL(c.url).searchParams.get('rest_route') === '/wp/v2/posts')).toBe(true);
  });
});

describe('ghost', () => {
  const m = mockFetch({
    'https://g.ex/ghost/api/content/posts/': { posts: [{ id: '1', slug: 's', title: 'T', url: 'https://g.ex/s/', custom_excerpt: 'E', published_at: '2026-10-01T00:00:00.000Z', tags: [{ name: 'Pub' }, { name: '#internal', visibility: 'internal' }], authors: [{ name: 'Ada' }], reading_time: 3 }], meta: { pagination: { total: 12 } } },
    'https://g.ex/ghost/api/content/posts/slug/s/': { posts: [{ id: '1', slug: 's', title: 'T', url: 'https://g.ex/s/', html: '<h2>H</h2><p>P</p>' }] },
  });
  const a = ghost({ url: 'https://g.ex', key: 'abc123', fetch: m.fetch });
  it('lists with key, NQL filter and pagination total; hides internal tags', async () => {
    const r = await a.list({ tag: 'My Tag', since: '2026-01-01' });
    expect(r.total).toBe(12);
    expect(r.items[0]).toMatchObject({ title: 'T', tags: ['Pub'], authors: ['Ada'], readingMinutes: 3 });
    const u = new URL(m.calls[0].url);
    expect(u.searchParams.get('key')).toBe('abc123');
    expect(u.searchParams.get('filter')).toBe("tag:my-tag+published_at:>='2026-01-01'");
  });
  it('gets a post by slug as markdown', async () => {
    expect((await a.get({ slug: 's' }))?.markdown).toBe('## H\n\nP');
  });
});

describe('sanity', () => {
  const m = mockFetch({
    'https://p1.apicdn.sanity.io/v2025-02-19/data/query/production': (u: URL) => {
      const q = u.searchParams.get('query')!;
      if (q.startsWith('{"items"')) return { result: { items: [{ id: 'a', title: 'S', slug: 'sl', published: '2026-10-01T00:00:00Z', tags: ['x'] }], total: 1 } };
      if (q.includes('match')) return { result: [{ id: 'a', title: 'S', slug: 'sl' }] };
      return { result: { id: 'a', title: 'S', slug: 'sl', body: [{ _type: 'block', style: 'h2', children: [{ text: 'Head' }] }, { _type: 'block', children: [{ text: 'Bold', marks: ['strong'] }] }] } };
    },
  });
  const a = sanity({ projectId: 'p1', urlPattern: 'https://site.ex/blog/{slug}', fetch: m.fetch });
  it('queries GROQ on the API CDN with JSON-encoded params', async () => {
    const r = await a.list({ tag: 'x' });
    expect(r).toMatchObject({ total: 1, items: [{ url: 'https://site.ex/blog/sl', title: 'S' }] });
    const u = new URL(m.calls[0].url);
    expect(u.searchParams.get('$type')).toBe('"post"');
    expect(u.searchParams.get('$tag')).toBe('"x"');
    expect(u.searchParams.get('query')).toContain('order(coalesce(publishedAt, _createdAt) desc)');
  });
  it('searches with match + score and renders Portable Text bodies', async () => {
    await a.search!('web mcp');
    expect(new URL(m.calls.at(-1)!.url).searchParams.get('$q')).toBe('"web* mcp*"');
    expect((await a.get({ slug: 'sl' }))?.markdown).toBe('## Head\n\n**Bold**');
  });
  it('refuses secret tokens', () => {
    expect(() => sanity({ projectId: 'p', token: 'sk' + 'a'.repeat(40) })).toThrow(/refusing/);
  });
});

describe('contentful', () => {
  const m = mockFetch({
    'https://cdn.contentful.com/spaces/sp/environments/master/entries': {
      total: 1,
      items: [{ sys: { id: 'e1', createdAt: '2026-10-01T00:00:00Z' }, fields: { title: 'C', slug: 'c', publishDate: '2026-10-02T00:00:00Z', author: { sys: { type: 'Link', linkType: 'Entry', id: 'p1' } }, heroImage: { sys: { type: 'Link', linkType: 'Asset', id: 'a1' } }, body: { nodeType: 'document', content: [{ nodeType: 'heading-2', content: [{ nodeType: 'text', value: 'H', marks: [] }] }, { nodeType: 'paragraph', content: [{ nodeType: 'text', value: 'I', marks: [{ type: 'italic' }] }] }] } } }],
      includes: { Entry: [{ sys: { id: 'p1' }, fields: { name: 'Ada' } }], Asset: [{ sys: { id: 'a1' }, fields: { file: { url: '//images.ctfassets.net/x.png' } } }] },
    },
  });
  const a = contentful({ space: 'sp', accessToken: 'cda', fetch: m.fetch });
  it('lists entries with order, select and resolved links', async () => {
    const r = await a.list({ since: '2026-01-01' });
    expect(r.items[0]).toMatchObject({ title: 'C', authors: ['Ada'], image: 'https://images.ctfassets.net/x.png', url: expect.stringContaining('/blog/c/') });
    const u = new URL(m.calls[0].url);
    expect(u.searchParams.get('order')).toBe('-fields.publishDate');
    expect(u.searchParams.get('fields.publishDate[gte]')).toBe('2026-01-01');
    expect(u.searchParams.get('content_type')).toBe('blogPost');
  });
  it('uses full-text query= for search and renders Rich Text', async () => {
    await a.search!('hello');
    expect(new URL(m.calls.at(-1)!.url).searchParams.get('query')).toBe('hello');
    expect((await a.get({ slug: 'c' }))?.markdown).toBe('## H\n\n*I*');
  });
  it('refuses management tokens and drops the token in proxy mode', async () => {
    expect(() => contentful({ space: 's', accessToken: 'CFPAT-xyz' })).toThrow(/management/);
    const p = mockFetch({ 'https://proxy.ex/cf/spaces/sp/environments/master/entries': { items: [] } });
    await contentful({ space: 'sp', proxy: 'https://proxy.ex/cf', fetch: p.fetch }).list();
    expect(p.calls[0].url).not.toContain('access_token');
    expect(p.calls[0].url.startsWith('https://proxy.ex/cf/spaces/sp/')).toBe(true);
  });
});

describe('enonic', () => {
  const m = mockFetch({
    'https://xp.ex/site/proj/master': (_u: URL, init?: RequestInit) => {
      const body = JSON.parse(String(init!.body));
      return { data: { guillotine: { queryDsl: [{ _id: 'id1', _name: 'post-one', displayName: 'Post one', dataAsJson: { text: '<h2>H</h2><p>x</p>', preface: '<p>Pre</p>', tags: ['a', 'b'] }, publish: { first: '2026-10-01T00:00:00Z' }, pageUrl: 'https://xp.ex/post-one', _echo: body } ] } } };
    },
  });
  const a = enonic({ endpoint: 'https://xp.ex/site/proj/master', contentType: 'com.ex:post', siteKey: '/site', fetch: m.fetch });
  it('POSTs Query DSL with the content type, sort and site key', async () => {
    const r = await a.list({ tag: 'a' });
    expect(r.items[0]).toMatchObject({ title: 'Post one', summary: 'Pre', tags: ['a', 'b'], url: 'https://xp.ex/post-one', markdown: '## H\n\nx' });
    const body = JSON.parse(String(m.calls[0].init!.body));
    expect(body.variables.q.boolean.must[0]).toEqual({ term: { field: 'type', value: { string: 'com.ex:post' } } });
    expect(body.variables.sort).toEqual({ field: 'publish.first', direction: 'DESC' });
    expect((m.calls[0].init!.headers as any)['X-Guillotine-SiteKey']).toBe('/site');
  });
  it('uses a fulltext expression for search', async () => {
    await a.search!('hello world');
    const body = JSON.parse(String(m.calls.at(-1)!.init!.body));
    expect(body.variables.q.boolean.must.at(-1).fulltext).toMatchObject({ query: 'hello world', operator: 'AND' });
  });
});

describe('strapi', () => {
  const m = mockFetch({
    'https://cms.ex/api/articles': {
      data: [
        { id: 1, documentId: 'd1', title: 'V5', slug: 'v5', description: 'D', publishedAt: '2026-10-01T00:00:00Z', cover: { url: '/uploads/c.png' }, author: { name: 'Ada' }, tags: [{ name: 't' }], content: [{ type: 'heading', level: 2, children: [{ type: 'text', text: 'H' }] }, { type: 'paragraph', children: [{ type: 'text', text: 'B', bold: true }] }] },
        { id: 2, attributes: { title: 'V4', slug: 'v4', content: '# md body', author: { data: { attributes: { name: 'Bo' } } } } },
      ],
      meta: { pagination: { total: 2 } },
    },
  });
  const a = strapi({ url: 'https://cms.ex', fetch: m.fetch });
  it('reads Strapi 5 and Strapi 4 shapes, Blocks and markdown bodies', async () => {
    const r = await a.list({ tag: 't' });
    expect(r.total).toBe(2);
    expect(r.items[0]).toMatchObject({ title: 'V5', authors: ['Ada'], tags: ['t'], image: 'https://cms.ex/uploads/c.png', markdown: '## H\n\n**B**' });
    expect(r.items[1]).toMatchObject({ title: 'V4', authors: ['Bo'], markdown: '# md body' });
    expect(new URL(m.calls[0].url).searchParams.get('filters[tags][name][$eqi]')).toBe('t');
  });
  it('searches title and description with $containsi', async () => {
    await a.search!('hi');
    expect(new URL(m.calls.at(-1)!.url).searchParams.get('filters[$or][0][title][$containsi]')).toBe('hi');
  });
});

describe('storyblok', () => {
  const m = mockFetch({
    'https://api.storyblok.com/v2/cdn/stories': { stories: [{ id: 1, uuid: 'u1', name: 'Story', slug: 'story', full_slug: 'blog/story', first_published_at: '2026-10-01T00:00:00Z', tag_list: ['x'], content: { intro: 'Hi', body: { type: 'doc', content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'H' }] }] } } }] },
  });
  it('lists published stories in a folder and renders richtext', async () => {
    const r = await storyblok({ token: 'pub', startsWith: 'blog/', fetch: m.fetch }).list({ tag: 'x' });
    expect(r.items[0]).toMatchObject({ title: 'Story', tags: ['x'], summary: 'Hi', markdown: '## H', url: expect.stringContaining('/blog/story') });
    const u = new URL(m.calls[0].url);
    expect(u.searchParams.get('version')).toBe('published');
    expect(u.searchParams.get('starts_with')).toBe('blog/');
    expect(u.searchParams.get('with_tag')).toBe('x');
  });
});

describe('generic', () => {
  it('staticAdapter filters, finds and aggregates', async () => {
    const a = staticAdapter([{ url: 'https://ex.com/a/', title: 'A', slug: 'a', tags: ['t'] }]);
    expect((await a.get({ slug: 'a' }))?.title).toBe('A');
    expect((await a.list({ tag: 'T' })).total).toBe(1);
    expect((await a.taxonomies!()).tags[0]).toEqual({ name: 't', count: 1 });
    const d = defineAdapter({ name: 'x', list: async () => ({ items: [] }), get: async () => null });
    expect(d.name).toBe('x');
  });
});

describe('shared helpers', () => {
  it('guardToken blocks known secret shapes and allows public ones', () => {
    expect(() => guardToken('CFPAT-abc', 'x')).toThrow();
    expect(() => guardToken('a'.repeat(24) + ':' + 'b'.repeat(64), 'x')).toThrow(/Admin/);
    expect(() => guardToken('22444f78447824223cefc48062', 'ghost')).not.toThrow();
  });
  it('via rewrites the origin to the proxy and keeps path and query', () => {
    expect(via({ proxy: 'https://p.ex/api' }, 'https://cdn.vendor.com/v1/x?y=1')).toBe('https://p.ex/api/v1/x?y=1');
    expect(via({}, 'https://cdn.vendor.com/x')).toBe('https://cdn.vendor.com/x');
  });
});

describe('rich text renderers', () => {
  it('portableText: lists, links and code', () => {
    const md = portableText([
      { _type: 'block', listItem: 'bullet', children: [{ text: 'one' }] },
      { _type: 'block', listItem: 'bullet', children: [{ text: 'link', marks: ['k'] }], markDefs: [{ _key: 'k', _type: 'link', href: 'https://x.ex' }] },
      { _type: 'code', language: 'js', code: 'a()' },
    ]);
    expect(md).toBe('- one\n- [link](https://x.ex)\n\n```js\na()\n```');
  });
  it('contentfulRichText: ordered lists and hyperlinks', () => {
    const md = contentfulRichText({ nodeType: 'document', content: [{ nodeType: 'ordered-list', content: [{ nodeType: 'list-item', content: [{ nodeType: 'paragraph', content: [{ nodeType: 'hyperlink', data: { uri: 'https://x.ex' }, content: [{ nodeType: 'text', value: 'go', marks: [] }] }] }] }] }] });
    expect(md).toBe('1. [go](https://x.ex)');
  });
  it('proseMirror and strapiBlocks: code and lists', () => {
    expect(proseMirror({ type: 'doc', content: [{ type: 'code_block', attrs: { class: 'language-ts' }, content: [{ type: 'text', text: 'x' }] }] })).toBe('```ts\nx\n```');
    expect(strapiBlocks([{ type: 'list', format: 'ordered', children: [{ children: [{ text: 'a' }] }, { children: [{ text: 'b' }] }] }])).toBe('1. a\n2. b');
  });
});

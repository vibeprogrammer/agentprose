// @vitest-environment node
// XML parsing is exercised with linkedom (what the CLI uses); real Chromium covers it in e2e.
import { DOMParser } from 'linkedom';
(globalThis as any).DOMParser = DOMParser;
import { describe, it, expect } from 'vitest';
import { parseFeed, parseSitemap, parseLlmsTxt, titleFromSlug } from '../../src/core/feeds';

const B = 'https://ex.com/';

describe('parseFeed', () => {
  it('parses RSS 2.0 with content:encoded, dc:creator and categories', () => {
    const rss = `<?xml version="1.0"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>T</title>
      <item><title>First &amp; best</title><link>https://ex.com/first/</link><pubDate>Tue, 13 Oct 2026 09:00:00 GMT</pubDate><dc:creator>Ada</dc:creator><category>news</category><description>Short</description><content:encoded><![CDATA[<p>Full <b>body</b></p>]]></content:encoded></item>
      <item><title>Second</title><link>/second/</link><description>&lt;p&gt;HTML summary&lt;/p&gt;</description></item></channel></rss>`;
    const p = parseFeed(rss, B)!;
    expect(p).toHaveLength(2);
    expect(p[0]).toMatchObject({ url: 'https://ex.com/first/', title: 'First & best', authors: ['Ada'], tags: ['news'], summary: 'Short', html: '<p>Full <b>body</b></p>', published: '2026-10-13T09:00:00.000Z', source: 'rss' });
    expect(p[1].url).toBe('https://ex.com/second/');
    expect(p[1].summary).toBe('HTML summary');
  });
  it('parses Atom with alternate links and summaries', () => {
    const atom = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>T</title>
      <entry><title type="html">A &lt;em&gt;post&lt;/em&gt;</title><link rel="self" href="/self"/><link rel="alternate" href="https://ex.com/a/"/><id>urn:1</id><updated>2026-10-02T00:00:00Z</updated><published>2026-10-01T00:00:00Z</published><author><name>Bo</name></author><category term="x" label="X"/><summary>Sum</summary><content type="html">&lt;p&gt;Body&lt;/p&gt;</content></entry></feed>`;
    const [p] = parseFeed(atom, B)!;
    expect(p).toMatchObject({ url: 'https://ex.com/a/', title: 'A post', authors: ['Bo'], tags: ['X'], summary: 'Sum', html: '<p>Body</p>', published: '2026-10-01T00:00:00.000Z', updated: '2026-10-02T00:00:00.000Z' });
  });
  it('parses JSON Feed 1.1', () => {
    const jf = JSON.stringify({ version: 'https://jsonfeed.org/version/1.1', items: [{ id: '1', url: '/j/', title: 'J', content_html: '<p>Hi there</p>', date_published: '2026-10-03T00:00:00Z', tags: ['t'], authors: [{ name: 'Cy' }] }] });
    const [p] = parseFeed(jf, B)!;
    expect(p).toMatchObject({ url: 'https://ex.com/j/', title: 'J', tags: ['t'], authors: ['Cy'], summary: 'Hi there', source: 'jsonfeed' });
  });
  it('returns null for things that are not feeds', () => {
    expect(parseFeed('<html><body>no</body></html>', B)).toBeNull();
    expect(parseFeed('{"not":"a feed"}', B)).toBeNull();
    expect(parseFeed('plain text', B)).toBeNull();
  });
});

describe('parseSitemap', () => {
  it('reads urlsets and sitemap indexes', () => {
    const set = parseSitemap('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://ex.com/a/</loc><lastmod>2026-10-01</lastmod></url><url><loc>https://ex.com/b/</loc></url></urlset>', B);
    expect(set.urls).toEqual([{ url: 'https://ex.com/a/', updated: '2026-10-01T00:00:00.000Z' }, { url: 'https://ex.com/b/', updated: undefined }]);
    const idx = parseSitemap('<?xml version="1.0"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>https://ex.com/post-sitemap.xml</loc></sitemap></sitemapindex>', B);
    expect(idx.sitemaps).toEqual(['https://ex.com/post-sitemap.xml']);
  });
});

describe('parseLlmsTxt', () => {
  it('reads title, summary and links with notes', () => {
    const r = parseLlmsTxt('# My Site\n\n> What it is.\n\n## Posts\n\n- [Hello](/hello/): First post\n- [Docs](https://ex.com/docs/)\n', B);
    expect(r.name).toBe('My Site');
    expect(r.description).toBe('What it is.');
    expect(r.links.map((l) => [l.url, l.title, l.summary])).toEqual([
      ['https://ex.com/hello/', 'Hello', 'First post'],
      ['https://ex.com/docs/', 'Docs', undefined],
    ]);
  });
  it('derives readable titles from slugs', () => {
    expect(titleFromSlug('https://ex.com/2026-10-01-my-first_post/')).toBe('My first post');
  });
});

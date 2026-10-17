import type { PostSummary, Post } from './types';
import { abs, clean, iso, slugOf, stripHtml, readingMinutes } from './util';

function txt(el: Element | null | undefined): string {
  return clean(el?.textContent);
}

/** Descendants by local name (namespace prefixes ignored). A manual walk: parsers disagree on getElementsByTagName('*'). */
function kids(el: Element, name: string, out: Element[] = []): Element[] {
  for (const c of el.children) {
    const n = (c.localName || c.tagName).toLowerCase();
    if (n === name.toLowerCase() || n.endsWith(':' + name.toLowerCase())) out.push(c);
    kids(c, name, out);
  }
  return out;
}

function kid(el: Element, name: string): Element | undefined {
  const n = name.toLowerCase();
  for (const c of el.children) {
    const t = (c.localName || c.tagName).toLowerCase();
    if (t === n || t.endsWith(':' + n)) return c;
  }
  return undefined;
}

function summarize(html?: string): string | undefined {
  if (!html) return undefined;
  const t = stripHtml(html);
  return t.length > 300 ? t.slice(0, 297).replace(/\s+\S*$/, '') + '…' : t || undefined;
}

/** Parses RSS 2.0, RSS 1.0/RDF, Atom 1.0 and JSON Feed 1.x into posts. Returns null when the text is none of them. */
export function parseFeed(text: string, base: string): Post[] | null {
  const t = text.trimStart();
  if (t.startsWith('{')) {
    try {
      const j = JSON.parse(t);
      if (!Array.isArray(j.items)) return null;
      return j.items
        .map((i: any): Post | null => {
          const url = abs(i.url || i.external_url || i.id, base);
          if (!url) return null;
          const html = i.content_html as string | undefined;
          return {
            url,
            id: i.id ? String(i.id) : undefined,
            slug: slugOf(url),
            title: clean(i.title) || summarize(html || i.content_text)?.slice(0, 80) || url,
            summary: clean(i.summary) || summarize(html || i.content_text),
            published: iso(i.date_published),
            updated: iso(i.date_modified),
            authors: (i.authors || (i.author ? [i.author] : [])).map((a: any) => clean(a.name)).filter(Boolean),
            tags: Array.isArray(i.tags) ? i.tags.map(clean) : undefined,
            image: abs(i.image || i.banner_image, base),
            html,
            readingMinutes: html || i.content_text ? readingMinutes(stripHtml(html || i.content_text)) : undefined,
            source: 'jsonfeed',
          };
        })
        .filter(Boolean);
    } catch {
      return null;
    }
  }
  if (!t.startsWith('<')) return null;
  const doc = new DOMParser().parseFromString(t, 'text/xml');
  const root = doc.documentElement;
  if (!root || kids(root, 'parsererror').length || /parsererror/i.test(root.localName || '')) return null;
  const name = (root.localName || root.tagName).toLowerCase().replace(/^.*:/, '');
  if (name === 'feed') {
    return kids(root, 'entry').map((e): Post => {
      const links = kids(e, 'link');
      const link = links.find((l) => (l.getAttribute('rel') || 'alternate') === 'alternate') || links[0];
      const url = abs(link?.getAttribute('href'), base) || txt(kid(e, 'id'));
      const content = kid(e, 'content');
      const html = content ? content.textContent || undefined : undefined;
      const sum = kid(e, 'summary');
      return {
        url,
        id: txt(kid(e, 'id')) || undefined,
        slug: slugOf(url),
        title: stripHtml(kid(e, 'title')?.textContent || '') || url,
        summary: summarize(sum?.textContent || html),
        published: iso(txt(kid(e, 'published')) || txt(kid(e, 'updated'))),
        updated: iso(txt(kid(e, 'updated'))),
        authors: kids(e, 'author').map((a) => txt(kid(a, 'name'))).filter(Boolean),
        tags: kids(e, 'category').map((c) => clean(c.getAttribute('label') || c.getAttribute('term'))).filter(Boolean),
        html,
        readingMinutes: html ? readingMinutes(stripHtml(html)) : undefined,
        source: 'atom',
      };
    });
  }
  if (name === 'rss' || name === 'rdf') {
    return kids(root, 'item').map((i): Post => {
      const url = abs(txt(kid(i, 'link')) || txt(kid(i, 'guid')), base) || '';
      const encoded = kid(i, 'encoded');
      const desc = kid(i, 'description')?.textContent || undefined;
      const html = encoded?.textContent || undefined;
      const media = kids(i, 'content').find((m) => /image/.test(m.getAttribute('medium') || m.getAttribute('type') || '')) || kid(i, 'enclosure');
      return {
        url,
        id: txt(kid(i, 'guid')) || undefined,
        slug: slugOf(url),
        title: stripHtml(kid(i, 'title')?.textContent || '') || url,
        summary: summarize(desc || html),
        published: iso(txt(kid(i, 'pubDate')) || txt(kid(i, 'date'))),
        authors: [...kids(i, 'creator'), ...kids(i, 'author')].map(txt).filter(Boolean),
        tags: kids(i, 'category').map(txt).filter(Boolean),
        image: media && /image/.test(media.getAttribute('type') || media.getAttribute('medium') || 'image') ? abs(media.getAttribute('url'), base) : undefined,
        html: html || (desc && desc.length > 600 ? desc : undefined),
        readingMinutes: html ? readingMinutes(stripHtml(html)) : undefined,
        source: 'rss',
      };
    }).filter((p) => p.url);
  }
  return null;
}

export interface SitemapResult {
  urls: { url: string; updated?: string }[];
  sitemaps: string[];
}

/** Parses a sitemap or sitemap index. */
export function parseSitemap(text: string, base: string): SitemapResult {
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  const root = doc.documentElement;
  const out: SitemapResult = { urls: [], sitemaps: [] };
  if (!root) return out;
  const isIndex = (root.localName || root.tagName).toLowerCase() === 'sitemapindex';
  for (const n of kids(root, isIndex ? 'sitemap' : 'url')) {
    const loc = abs(txt(kid(n, 'loc')), base);
    if (!loc) continue;
    if (isIndex) out.sitemaps.push(loc);
    else out.urls.push({ url: loc, updated: iso(txt(kid(n, 'lastmod'))) });
  }
  return out;
}

/** Parses llms.txt (https://llmstxt.org): "# Title", "> summary", "- [name](url): notes". */
export function parseLlmsTxt(text: string, base: string): { name?: string; description?: string; links: PostSummary[] } {
  const name = text.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const description = text.match(/^>\s+(.+)$/m)?.[1]?.trim();
  const links: PostSummary[] = [];
  let section = '';
  for (const line of text.split('\n')) {
    const h = line.match(/^##\s+(.+)/);
    if (h) section = h[1].trim();
    const m = line.match(/^\s*[-*]\s*\[([^\]]+)\]\(([^)\s]+)\)\s*:?\s*(.*)$/);
    if (m) {
      const url = abs(m[2], base);
      // The section ("## Posts", "## Docs") is kept as `group`; it is not a taxonomy.
      if (url) links.push({ url, slug: slugOf(url), title: m[1].trim(), summary: m[3].trim() || undefined, source: 'llms.txt', ...(section ? { group: section } : {}) } as PostSummary);
    }
  }
  return { name, description, links };
}

/** "my-first-post" → "My first post". Used for sitemap-only records. */
export function titleFromSlug(url: string): string {
  const s = slugOf(url).replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/[-_]+/g, ' ').trim();
  return s ? s[0].toUpperCase() + s.slice(1) : url;
}

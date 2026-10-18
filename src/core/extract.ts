import type { Post, SiteInfo } from './types';
import { NOISE, toMarkdown } from './markdown';
import { abs, clean, iso, readingMinutes, slugOf, uniq } from './util';

const ARTICLE_TYPES = /^(Article|BlogPosting|NewsArticle|TechArticle|Report|ScholarlyArticle|SocialMediaPosting|LiveBlogPosting|HowTo|Recipe|Review|AnalysisNewsArticle|OpinionNewsArticle)$/;

const BODY_SELECTORS = [
  '[data-agent-content]',
  '[itemprop="articleBody"]',
  '.e-content',
  '.entry-content',
  '.post-content',
  '.article-content',
  '.article-body',
  '.post-body',
  '.gh-content',
  '.prose',
  '.markdown-body',
  '.content-body',
  '#content article',
];

type LD = Record<string, any>;

function types(o: LD): string[] {
  const t = o['@type'];
  return Array.isArray(t) ? t : t ? [t] : [];
}

/** All JSON-LD objects on the page, flattened through @graph and arrays. */
export function jsonLd(doc: Document): LD[] {
  const out: LD[] = [];
  const walk = (x: any) => {
    if (!x || typeof x !== 'object') return;
    if (Array.isArray(x)) return x.forEach(walk);
    out.push(x);
    if (x['@graph']) walk(x['@graph']);
  };
  doc.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
    try {
      walk(JSON.parse(s.textContent || ''));
    } catch {
      /* invalid JSON-LD is common; skip it */
    }
  });
  return out;
}

function ldName(x: any): string | undefined {
  if (!x) return undefined;
  if (typeof x === 'string') return x;
  if (Array.isArray(x)) return ldName(x[0]);
  return x.name || x.headline || undefined;
}

function ldNames(x: any): string[] {
  if (!x) return [];
  return (Array.isArray(x) ? x : [x]).map(ldName).filter(Boolean) as string[];
}

function ldImage(x: any): string | undefined {
  if (!x) return undefined;
  if (typeof x === 'string') return x;
  if (Array.isArray(x)) return ldImage(x[0]);
  return x.url || x.contentUrl;
}

function meta(doc: Document, key: string): string | undefined {
  const el = doc.querySelector(`meta[property="${key}"],meta[name="${key}"],meta[itemprop="${key}"]`);
  return clean(el?.getAttribute('content')) || undefined;
}

function metas(doc: Document, key: string): string[] {
  return [...doc.querySelectorAll(`meta[property="${key}"],meta[name="${key}"]`)].map((m) => clean(m.getAttribute('content'))).filter(Boolean);
}

function splitList(s?: string): string[] {
  return s ? s.split(/\s*,\s*/).map(clean).filter(Boolean) : [];
}

/** Finds the element holding the main article body. */
export function findBody(doc: Document, selector?: string): Element | null {
  if (selector) {
    const el = doc.querySelector(selector);
    if (el) return el;
  }
  for (const s of BODY_SELECTORS) {
    const el = doc.querySelector(s);
    if (el && textLen(el) > 200) return el;
  }
  const arts = [...doc.querySelectorAll('article')].filter((a) => !a.parentElement?.closest('article'));
  if (arts.length === 1) return arts[0];
  if (arts.length > 1) {
    // Listing pages have many short <article>s; a post page has one long one.
    const best = arts.reduce((a, b) => (textLen(b) > textLen(a) ? b : a));
    if (textLen(best) > 0.6 * arts.reduce((n, a) => n + textLen(a), 0)) return best;
  }
  const main = doc.querySelector('main,[role="main"]');
  if (main) return main;
  // Density fallback: the element with the most paragraph text.
  let best: Element | null = null;
  let score = 0;
  doc.querySelectorAll('p').forEach((p) => {
    const parent = p.parentElement;
    if (!parent) return;
    const sc = [...parent.children].filter((c) => c.tagName === 'P').reduce((n, c) => n + textLen(c), 0);
    if (sc > score) {
      score = sc;
      best = parent;
    }
  });
  return best || doc.body;
}

function textLen(el: Element): number {
  return (el.textContent || '').replace(/\s+/g, ' ').length;
}

/** A detached, de-noised copy of the article body. */
export function cleanBody(doc: Document, opts: { selector?: string; ignore?: string[] } = {}): Element | null {
  const body = findBody(doc, opts.selector);
  if (!body) return null;
  const copy = body.cloneNode(true) as Element;
  const sel = [NOISE, ...(opts.ignore || [])].join(',');
  try {
    copy.querySelectorAll(sel).forEach((n) => n.remove());
  } catch {
    copy.querySelectorAll(NOISE).forEach((n) => n.remove());
  }
  return copy;
}

export interface PageData extends Post {
  isArticle: boolean;
  description?: string;
}

/** Everything the page itself says about the content it shows. */
export function extractPage(doc: Document, url: string, opts: { selector?: string; ignore?: string[] } = {}): PageData {
  const lds = jsonLd(doc);
  const art = lds.find((o) => types(o).some((t) => ARTICLE_TYPES.test(t))) || {};
  const page = lds.find((o) => types(o).some((t) => /WebPage$/.test(t))) || {};
  const canonical = abs(doc.querySelector('link[rel="canonical"]')?.getAttribute('href'), url) || abs(meta(doc, 'og:url'), url) || url.split('#')[0];
  const ogType = meta(doc, 'og:type');
  const bodyEl = cleanBody(doc, opts);
  const h1 = bodyEl?.querySelector('h1') || doc.querySelector('h1');
  // Drop the in-body H1 when it repeats the title; the title is returned separately.
  const title =
    clean(art.headline || art.name) ||
    meta(doc, 'og:title') ||
    clean(h1?.textContent) ||
    clean(doc.title);
  if (bodyEl) {
    const first = bodyEl.querySelector('h1');
    if (first && clean(first.textContent) === title) first.remove();
  }
  const markdown = bodyEl ? toMarkdown(bodyEl, canonical) : '';
  const timeEl = doc.querySelector('article time[datetime],time[datetime][itemprop="datePublished"],time.published,time[datetime]');
  const tags = uniq<string>([
    ...splitList(Array.isArray(art.keywords) ? art.keywords.join(',') : art.keywords),
    ...metas(doc, 'article:tag'),
    ...[...doc.querySelectorAll('a[rel~="tag"]')].map((a) => clean(a.textContent)),
  ]);
  const categories = uniq<string>([
    ...(Array.isArray(art.articleSection) ? art.articleSection : [art.articleSection]),
    ...metas(doc, 'article:section'),
    ...[...doc.querySelectorAll('a[rel~="category"]')].map((a) => clean(a.textContent)),
  ]);
  const authors = uniq<string>([
    ...ldNames(art.author),
    ...metas(doc, 'article:author').filter((a) => !/^https?:/.test(a)),
    meta(doc, 'author'),
    clean(doc.querySelector('[rel="author"],.p-author,.author-name,[itemprop="author"] [itemprop="name"],.wp-block-post-author-name,.author.vcard .fn')?.textContent),
  ]).slice(0, 5);
  // Listing pages (many <article> cards) are not articles even when they are long and dated.
  const cards = doc.querySelectorAll('article').length;
  const isArticle = !!art['@type'] || ogType === 'article' || (cards === 1 && markdown.length > 1200 && !!timeEl);
  return {
    url: canonical,
    slug: slugOf(canonical),
    title,
    summary: clean(art.description) || meta(doc, 'description') || meta(doc, 'og:description'),
    description: meta(doc, 'description'),
    published: iso(art.datePublished || meta(doc, 'article:published_time') || timeEl?.getAttribute('datetime')),
    updated: iso(art.dateModified || meta(doc, 'article:modified_time') || meta(doc, 'og:updated_time')),
    authors: authors.length ? authors : undefined,
    tags: tags.length ? tags : undefined,
    categories: categories.length ? categories : undefined,
    image: abs(ldImage(art.image) || meta(doc, 'og:image') || ldImage(page.primaryImageOfPage), canonical),
    lang: doc.documentElement.getAttribute('lang') || art.inLanguage || undefined,
    readingMinutes: markdown ? readingMinutes(markdown) : undefined,
    markdown,
    isArticle,
    source: 'page',
  };
}

/** Site-level facts the page head declares. */
export function extractSite(doc: Document, url: string): SiteInfo {
  const lds = jsonLd(doc);
  const site = lds.find((o) => types(o).includes('WebSite')) || {};
  const org = lds.find((o) => types(o).some((t) => t === 'Organization' || t === 'Person')) || {};
  const feeds = [...doc.querySelectorAll('link[rel="alternate"]')]
    .filter((l) => /(rss|atom|feed)\+(xml|json)|application\/json/.test(l.getAttribute('type') || ''))
    .map((l) => abs(l.getAttribute('href'), url))
    .filter(Boolean) as string[];
  const origin = new URL(url).origin;
  return {
    name: clean(site.name) || meta(doc, 'og:site_name') || meta(doc, 'application-name') || clean(org.name) || undefined,
    description: clean(site.description) || undefined,
    url: abs(site.url, url) || origin + '/',
    lang: doc.documentElement.getAttribute('lang') || undefined,
    logo: abs(ldImage(org.logo) || doc.querySelector('link[rel~="icon"]')?.getAttribute('href'), url),
    feeds: uniq<string>(feeds),
    generator: meta(doc, 'generator'),
  };
}

export interface Section {
  id: string;
  level: number;
  title: string;
  /** Character offset of the section heading in the article markdown. */
  offset: number;
}

/** Table of contents parsed from article markdown (ATX headings, code fences skipped). */
export function toc(markdown: string): Section[] {
  const out: Section[] = [];
  const seen: Record<string, number> = {};
  let fence = false;
  let pos = 0;
  for (const line of markdown.split('\n')) {
    if (/^```/.test(line)) fence = !fence;
    const m = !fence && line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    if (m) {
      const title = m[2].replace(/\\([\\`*_[\]])/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
      let id = title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'section';
      if (seen[id] !== undefined) id = `${id}-${++seen[id]}`;
      else seen[id] = 0;
      out.push({ id, level: m[1].length, title, offset: pos });
    }
    pos += line.length + 1;
  }
  return out;
}

/** The markdown of one section (up to the next heading of the same or higher level). */
export function section(markdown: string, query: string): { section: Section; markdown: string } | null {
  const list = toc(markdown);
  const q = query.toLowerCase().replace(/^#/, '').trim();
  const s =
    list.find((x) => x.id === q) ||
    list.find((x) => x.title.toLowerCase() === q) ||
    list.find((x) => x.title.toLowerCase().includes(q)) ||
    list.find((x) => x.id.includes(q.replace(/[^\p{L}\p{N}]+/gu, '-')));
  if (!s) return null;
  const next = list.find((x) => x.offset > s.offset && x.level <= s.level);
  return { section: s, markdown: markdown.slice(s.offset, next ? next.offset : undefined).trim() };
}

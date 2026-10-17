import type { Config, ContentAdapter, ListOptions, Post, PostRef, PostSummary, SiteInfo, Taxonomies, Term } from './types';
import { extractPage, extractSite } from './extract';
import { parseFeed, parseLlmsTxt, parseSitemap, titleFromSlug } from './feeds';
import { toMarkdown } from './markdown';
import { abs, fetchText, norm, parseHtml, sameOrigin, slugOf, stripHtml } from './util';

const FEED_PATHS = ['feed.json', 'index.xml', 'feed.xml', 'atom.xml', 'rss.xml', 'feed/', 'rss/'];
/** Sitemap URLs that are listings, not posts. */
const NOT_POST = /\/(tags?|categor(y|ies)|topics?|authors?|page|search|archives?|feed|wp-content|assets|static|static\/.*|cdn-cgi)(\/|$)|\.(xml|json|txt|pdf|png|jpe?g|gif|svg|webp|css|js)$/i;

export interface Corpus {
  posts: Post[];
  site: Partial<SiteInfo>;
  sources: string[];
}

/** Merge b into a, keeping a's values unless missing. */
function merge(a: Post, b: Post): Post {
  const out: any = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (v === undefined || v === '' || (Array.isArray(v) && !v.length)) continue;
    const cur = out[k];
    if (cur === undefined || cur === '' || (Array.isArray(cur) && !cur.length) || (k === 'title' && a.source === 'sitemap')) out[k] = v;
  }
  if (a.source === 'sitemap' && b.source) out.source = b.source;
  return out;
}

/**
 * The zero-config content source: a prebuilt index if one is declared, else
 * RSS/Atom/JSON Feed + sitemap + llms.txt, with the current page merged in.
 * Nothing is fetched until a tool first needs the corpus.
 */
export function autoSource(cfg: Config, doc: Document = document, loc: string = location.href): ContentAdapter & { corpus(): Promise<Corpus> } {
  const base = cfg.baseUrl || new URL(loc).origin + '/';
  const baseDir = base.replace(/\/?$/, '/');
  let pending: Promise<Corpus> | undefined;
  const cacheKey = 'readmcp:' + baseDir;

  async function build(): Promise<Corpus> {
    const ttl = cfg.cacheTtl ?? 600;
    if (ttl > 0) {
      try {
        const c = JSON.parse(sessionStorage.getItem(cacheKey) || 'null');
        if (c && Date.now() - c.t < ttl * 1000) return c.v;
      } catch {
        /* storage blocked */
      }
    }
    const byUrl = new Map<string, Post>();
    const sources: string[] = [];
    const site: Partial<SiteInfo> = {};
    const add = (p: Post) => {
      if (!p.url || !sameOrigin(p.url, base)) return;
      const k = norm(p.url);
      const cur = byUrl.get(k);
      byUrl.set(k, cur ? merge(cur, p) : p);
    };
    const max = cfg.maxPosts ?? 2000;
    const indexUrl = cfg.index ?? (doc.querySelector('link[rel="readmcp-index"]')?.getAttribute('href') || baseDir + 'readmcp.json');
    if (indexUrl) {
      const t = await fetchText(new URL(indexUrl, base).href);
      try {
        const j = t && JSON.parse(t);
        if (j && Array.isArray(j.posts)) {
          j.posts.slice(0, max).forEach((p: Post) => add({ ...p, url: new URL(p.url, base).href, source: p.source || 'index' }));
          Object.assign(site, j.site || {});
          sources.push('index');
        }
      } catch {
        /* fall through to feeds */
      }
    }
    if (!sources.length) {
      const declared = cfg.feeds?.length ? cfg.feeds : extractSite(doc, loc).feeds || [];
      const candidates = declared.length ? declared : FEED_PATHS.map((p) => baseDir + p);
      for (const f of candidates) {
        const t = await fetchText(new URL(f, base).href);
        const posts = t ? parseFeed(t, base) : null;
        if (posts) {
          posts.slice(0, max).forEach(add);
          sources.push('feed');
          site.feeds = [new URL(f, base).href];
          if (!cfg.feeds || cfg.feeds.length < 2) break;
        }
      }
      if (cfg.sitemap !== false) {
        const queue = [cfg.sitemap || baseDir + 'sitemap.xml'];
        let n = 0;
        while (queue.length && n < (cfg.maxSitemaps ?? 5) && byUrl.size < max) {
          const sm = queue.shift()!;
          n++;
          const t = await fetchText(new URL(sm, base).href);
          if (!t || !t.includes('<')) continue;
          const r = parseSitemap(t, base);
          // Post sitemaps first (WordPress/Yoast/Ghost name them so).
          queue.push(...r.sitemaps.sort((a, b) => +/post/.test(b) - +/post/.test(a)));
          for (const u of r.urls) {
            const path = new URL(u.url).pathname;
            if (path === new URL(baseDir).pathname || NOT_POST.test(path)) continue;
            if (byUrl.size >= max) break;
            add({ url: u.url, slug: slugOf(u.url), title: titleFromSlug(u.url), updated: u.updated, source: 'sitemap' });
          }
          if (r.urls.length) site.sitemap = new URL(sm, base).href;
        }
        if (site.sitemap) sources.push('sitemap');
      }
    }
    if (cfg.llmsTxt !== false) {
      const u = typeof cfg.llmsTxt === 'string' ? cfg.llmsTxt : baseDir + 'llms.txt';
      const t = await fetchText(new URL(u, base).href);
      if (t && /^#\s/m.test(t) && !/^\s*</.test(t)) {
        const l = parseLlmsTxt(t, base);
        site.llmsTxt = new URL(u, base).href;
        site.name ||= l.name;
        site.description ||= l.description;
        l.links.forEach((p) => {
          const k = norm(p.url);
          const cur = byUrl.get(k);
          if (cur) byUrl.set(k, merge(cur.source === 'sitemap' ? { ...cur, title: p.title, source: 'llms.txt' } : cur, p));
          else if (sameOrigin(p.url, base) && !NOT_POST.test(new URL(p.url).pathname)) add(p);
        });
        sources.push('llms.txt');
      }
    }
    const v: Corpus = { posts: [...byUrl.values()], site, sources };
    if (ttl > 0) {
      try {
        // Store without bodies to stay well inside storage quotas.
        sessionStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), v: { ...v, posts: v.posts.map(({ html, markdown, ...p }) => p) } }));
      } catch {
        /* quota */
      }
    }
    return v;
  }

  const corpus = () => {
    if (!pending) {
      pending = build().then((c) => {
        // Always include the page the reader is on.
        const here = extractPage(doc, loc, { selector: cfg.contentSelector, ignore: cfg.ignoreSelectors });
        if (here.isArticle) {
          const k = norm(here.url);
          const i = c.posts.findIndex((p) => norm(p.url) === k);
          const { isArticle, description, ...post } = here;
          if (i >= 0) c.posts[i] = merge(post, c.posts[i]);
          else c.posts.unshift(post);
        }
        return c;
      });
      pending.catch(() => (pending = undefined));
    }
    return pending;
  };

  const find = (posts: Post[], ref: PostRef) => {
    if (ref.url) {
      const k = norm(new URL(ref.url, base).href);
      const p = posts.find((x) => norm(x.url) === k);
      if (p) return p;
    }
    if (ref.id) {
      const p = posts.find((x) => x.id === ref.id);
      if (p) return p;
    }
    const slug = (ref.slug || (ref.url ? slugOf(new URL(ref.url, base).href) : '')).toLowerCase();
    return slug ? posts.find((x) => (x.slug || slugOf(x.url)).toLowerCase() === slug) : undefined;
  };

  // Pagefind (pagefind.app) ships a chunked full-text index with many static sites; reuse it when present.
  const pagefind =
    cfg.pagefind === false
      ? undefined
      : cfg.pagefind || (doc.querySelector('[data-pagefind-body],script[src*="pagefind"],link[href*="pagefind"]') ? baseDir + 'pagefind/pagefind.js' : undefined);
  let pf: Promise<any> | undefined;

  return {
    name: 'auto',
    corpus,
    search: pagefind
      ? async (q: string, o: ListOptions = {}) => {
          pf ||= import(/* @vite-ignore */ new URL(pagefind, base).href).then(async (m) => (await m.init?.(), m));
          const r = await (await pf).search(q);
          const data = await Promise.all((r?.results || []).slice(0, o.limit || 10).map((x: any) => x.data()));
          return {
            items: data.map((d: any) => ({ url: abs(d.url, base)!, title: d.meta?.title || d.url, summary: stripHtml(d.excerpt || ''), image: d.meta?.image, source: 'pagefind' })),
          };
        }
      : undefined,
    async list(opts: ListOptions = {}) {
      const { posts } = await corpus();
      return filterPosts(posts, opts);
    },
    async get(ref: PostRef) {
      const { posts } = await corpus();
      const hit = find(posts, ref);
      const url = hit?.url || (ref.url ? new URL(ref.url, base).href : undefined);
      if (hit?.markdown) return hit;
      // Sharded CLI index: each post's markdown lives in its own small file.
      const md = (hit as any)?.md;
      if (md) {
        const t = await fetchText(new URL(md, base).href);
        if (t) return { ...hit!, markdown: t };
      }
      if (hit?.html) {
        const md = toMarkdown(parseHtml(hit.html).body, hit.url);
        if (md.length > 400 || !url) return { ...hit, markdown: md };
      }
      if (!url || !sameOrigin(url, base)) return hit || null;
      if (norm(url) === norm(loc)) {
        const { isArticle, description, ...p } = extractPage(doc, loc, { selector: cfg.contentSelector, ignore: cfg.ignoreSelectors });
        return hit ? merge(p, hit) : p;
      }
      const t = await fetchText(url);
      if (!t) return hit || null;
      const { isArticle, description, ...p } = extractPage(parseHtml(t), url, { selector: cfg.contentSelector, ignore: cfg.ignoreSelectors });
      const full = hit ? merge(p, hit) : p;
      if (hit) Object.assign(hit, { markdown: full.markdown, title: hit.source === 'sitemap' ? p.title : hit.title });
      return full;
    },
    async taxonomies(): Promise<Taxonomies> {
      const { posts } = await corpus();
      return aggregate(posts);
    },
    async site() {
      return (await corpus()).site;
    },
  };
}

/** Counts tags, categories and authors across posts, most used first. */
export function aggregate(posts: PostSummary[]): Taxonomies {
  const count = (key: 'tags' | 'categories' | 'authors') => {
    const m = new Map<string, Term>();
    posts.forEach((p) =>
      (p[key] || []).forEach((name) => {
        const k = name.toLowerCase();
        const t = m.get(k) || { name, count: 0 };
        t.count!++;
        m.set(k, t);
      }),
    );
    return [...m.values()].sort((a, b) => b.count! - a.count! || a.name.localeCompare(b.name));
  };
  return { tags: count('tags'), categories: count('categories'), authors: count('authors') };
}

const has = (list: string[] | undefined, v: string) => !!list?.some((x) => x.toLowerCase() === v.toLowerCase());

/** Client-side filtering, sorting and paging with the same semantics adapters implement server-side. */
export function filterPosts(posts: PostSummary[], o: ListOptions = {}): { items: PostSummary[]; total: number } {
  const since = o.since ? Date.parse(o.since) : NaN;
  const until = o.until ? Date.parse(o.until) : NaN;
  const time = (p: PostSummary) => Date.parse(p.published || p.updated || '') || 0;
  let r = posts.filter(
    (p) =>
      (!o.tag || has(p.tags, o.tag)) &&
      (!o.category || has(p.categories, o.category)) &&
      (!o.author || has(p.authors, o.author)) &&
      (isNaN(since) || time(p) >= since) &&
      (isNaN(until) || time(p) <= until),
  );
  if (o.sort !== 'relevance') r = [...r].sort((a, b) => (o.sort === 'oldest' ? time(a) - time(b) : time(b) - time(a)));
  const off = o.offset || 0;
  return { items: r.slice(off, off + (o.limit ?? r.length)), total: r.length };
}

import type { ContentAdapter, ListOptions, Post, PostRef, Taxonomies, Term } from '../core/types';
import { clean, iso, readingMinutes, stripHtml, slugOf } from '../core/util';

export interface WordPressOptions {
  /** REST API root, e.g. https://example.com/wp-json/ (auto-detected from <link rel="https://api.w.org/">). */
  api: string;
  /** Post types to expose. Default ['posts']. Custom types use their rest_base, e.g. 'docs'. */
  types?: string[];
  fetch?: typeof fetch;
}

/**
 * WordPress REST API (core endpoints, no plugin or auth needed for public content).
 * Docs: https://developer.wordpress.org/rest-api/reference/posts/
 */
export function wordpress(o: WordPressOptions): ContentAdapter {
  const f = o.fetch || fetch.bind(globalThis);
  const root = o.api.replace(/\/?$/, '/');
  const types = o.types || ['posts'];
  const url = (path: string, q: Record<string, string | number | undefined> = {}) => {
    // Sites without pretty permalinks only answer ?rest_route=; both forms accept query params.
    const pretty = !root.includes('rest_route=');
    const u = new URL(pretty ? root + 'wp/v2/' + path : root, globalThis.location?.href);
    if (!pretty) u.searchParams.set('rest_route', '/wp/v2/' + path);
    for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== '') u.searchParams.set(k, String(v));
    return u.href;
  };
  const get = async (u: string) => {
    const r = await f(u, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(`WordPress API ${r.status}`);
    return { json: await r.json(), total: +(r.headers.get('X-WP-Total') || 0) || undefined };
  };
  const termCache: Record<string, Promise<Map<number, Term>>> = {};
  const terms = (tax: 'tags' | 'categories' | 'users') =>
    (termCache[tax] ||= get(url(tax, { per_page: 100, _fields: 'id,name,slug,link,count', ...(tax === 'users' ? {} : { orderby: 'count', order: 'desc' }) }))
      .then(({ json }) => new Map<number, Term>((json as any[]).map((t) => [t.id, { name: clean(t.name), slug: t.slug, url: t.link, count: t.count }])))
      .catch(() => new Map()));
  const termId = async (tax: 'tags' | 'categories' | 'users', name?: string) => {
    if (!name) return undefined;
    const n = name.toLowerCase();
    for (const [id, t] of await terms(tax)) if (t.name.toLowerCase() === n || t.slug === n) return id;
    return -1;
  };
  const map = async (p: any): Promise<Post> => {
    const [tags, cats, users] = await Promise.all([terms('tags'), terms('categories'), terms('users')]);
    const emb = p._embedded || {};
    const html = p.content?.rendered as string | undefined;
    const img = emb['wp:featuredmedia']?.[0]?.source_url;
    return {
      url: p.link,
      id: String(p.id),
      slug: p.slug || slugOf(p.link),
      title: stripHtml(p.title?.rendered || ''),
      summary: stripHtml(p.excerpt?.rendered || '').replace(/\s*(\[…\]|\[\.\.\.\]|…|Continue reading.*)$/, '') || undefined,
      published: iso(p.date_gmt ? p.date_gmt + 'Z' : p.date),
      updated: iso(p.modified_gmt ? p.modified_gmt + 'Z' : p.modified),
      authors: emb.author ? emb.author.map((a: any) => clean(a.name)).filter(Boolean) : users.get(p.author) ? [users.get(p.author)!.name] : undefined,
      tags: (p.tags || []).map((id: number) => tags.get(id)?.name).filter(Boolean),
      categories: (p.categories || []).map((id: number) => cats.get(id)?.name).filter(Boolean),
      image: img,
      html,
      readingMinutes: html ? readingMinutes(stripHtml(html)) : undefined,
      source: 'wordpress',
    };
  };
  const query = async (opts: ListOptions = {}, search?: string) => {
    const [tags, categories, author] = await Promise.all([termId('tags', opts.tag), termId('categories', opts.category), termId('users', opts.author)]);
    if (tags === -1 || categories === -1 || author === -1) return { items: [], total: 0 };
    const perPage = Math.min(100, opts.limit || 20);
    const q = {
      per_page: perPage,
      page: Math.floor((opts.offset || 0) / perPage) + 1,
      search,
      tags,
      categories,
      author,
      after: opts.since,
      before: opts.until,
      order: opts.sort === 'oldest' ? 'asc' : 'desc',
      orderby: search && opts.sort === 'relevance' ? 'relevance' : 'date',
      _fields: 'id,link,slug,title,excerpt,date,date_gmt,modified,modified_gmt,author,tags,categories,featured_media',
    };
    const res = await Promise.all(types.map((t) => get(url(t, q)).catch(() => ({ json: [], total: 0 }))));
    let items = await Promise.all(res.flatMap((r) => r.json as any[]).map(map));
    if (types.length > 1 && !search) {
      // One request per type: merge into one date-ordered page of at most `limit` items.
      const t = (p: Post) => Date.parse(p.published || '') || 0;
      items = items.sort((x, y) => (opts.sort === 'oldest' ? t(x) - t(y) : t(y) - t(x))).slice(0, perPage);
    } else if (types.length > 1) items = items.slice(0, perPage);
    return { items, total: res.reduce((n, r) => n + (r.total || 0), 0) || undefined };
  };
  return {
    name: 'wordpress',
    list: (opts) => query(opts),
    search: (q, opts) => query({ sort: 'relevance', ...opts }, q),
    async get(ref: PostRef) {
      const slug = ref.slug || (ref.url ? slugOf(ref.url) : undefined);
      for (const t of types) {
        const u = ref.id ? url(`${t}/${ref.id}`, { _embed: 'author,wp:featuredmedia' }) : url(t, { slug, _embed: 'author,wp:featuredmedia' });
        try {
          const { json } = await get(u);
          const p = Array.isArray(json) ? json[0] : json;
          if (p) return map(p);
        } catch {
          /* try next type */
        }
      }
      return null;
    },
    async taxonomies(): Promise<Taxonomies> {
      const [t, c, a] = await Promise.all([terms('tags'), terms('categories'), terms('users')]);
      return { tags: [...t.values()], categories: [...c.values()], authors: [...a.values()] };
    },
    async site() {
      try {
        const r = await f(root.includes('rest_route=') ? root : root + '?_fields=name,description,url', { headers: { Accept: 'application/json' } });
        const j = await r.json();
        return { name: stripHtml(j.name || ''), description: stripHtml(j.description || ''), url: j.url };
      } catch {
        return {};
      }
    },
  };
}

/** The REST root a WordPress page advertises, if any. */
export function detectWordPress(doc: Document): string | undefined {
  return doc.querySelector('link[rel="https://api.w.org/"]')?.getAttribute('href') || undefined;
}

/** Script-tag factory: data-api, data-types. */
export const fromAttributes = (o: Record<string, string>) => wordpress({ api: o.api, types: o.types ? o.types.split(',') : undefined });

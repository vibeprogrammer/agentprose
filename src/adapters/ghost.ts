import type { ContentAdapter, ListOptions, Post, Taxonomies } from '../core/types';
import { toMarkdown } from '../core/markdown';
import { parseHtml } from '../core/util';
import { type BaseOptions, via, finish, getJson, guardToken, lim, pageOf } from './_shared';

export interface GhostOptions extends BaseOptions {
  /** Your Ghost site (or *.ghost.io admin domain), e.g. https://demo.ghost.io */
  url: string;
  /** Content API key. Public by design: "safe for use in browsers" (docs.ghost.org/content-api). */
  key?: string;
}

/** Ghost Content API v5. https://docs.ghost.org/content-api */
export function ghost(o: GhostOptions): ContentAdapter {
  guardToken(o.key, 'ghost');
  const f = o.fetch || fetch.bind(globalThis);
  const api = (path: string, q: Record<string, string | number | undefined> = {}) => {
    const u = new URL(`ghost/api/content/${path}`, o.url.replace(/\/?$/, '/'));
    if (o.key) u.searchParams.set('key', o.key);
    for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== '') u.searchParams.set(k, String(v));
    return via(o, u.href);
  };
  const map = (p: any): Post =>
    finish({
      url: p.url,
      id: p.id,
      slug: p.slug,
      title: p.title,
      summary: p.custom_excerpt || p.excerpt || undefined,
      published: p.published_at,
      updated: p.updated_at,
      authors: (p.authors || []).map((a: any) => a.name),
      tags: (p.tags || []).filter((t: any) => t.visibility !== 'internal').map((t: any) => t.name),
      image: p.feature_image || undefined,
      readingMinutes: p.reading_time || undefined,
      markdown: p.html ? toMarkdown(parseHtml(p.html).body, p.url) : undefined,
      source: 'ghost',
    });
  const nql = (s: string) => `'${s.replace(/'/g, "\\'")}'`;
  const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const filter = (x: ListOptions) =>
    [
      x.tag && `tag:${slugify(x.tag)}`,
      x.author && `author:${slugify(x.author)}`,
      x.since && `published_at:>=${nql(x.since)}`,
      x.until && `published_at:<=${nql(x.until)}`,
    ]
      .filter(Boolean)
      .join('+') || undefined;
  return {
    name: 'ghost',
    async list(x: ListOptions = {}) {
      const limit = lim(x, 20, 100);
      const { json } = await getJson(f, api('posts/', { limit, page: pageOf(x, limit), include: 'tags,authors', fields: 'id,slug,title,url,custom_excerpt,excerpt,published_at,updated_at,feature_image,reading_time', filter: filter(x), order: `published_at ${x.sort === 'oldest' ? 'asc' : 'desc'}` }));
      return { items: (json.posts || []).map(map), total: json.meta?.pagination?.total };
    },
    async get(ref) {
      const path = ref.id ? `posts/${ref.id}/` : `posts/slug/${encodeURIComponent(ref.slug || new URL(ref.url!, o.url).pathname.split('/').filter(Boolean).pop() || '')}/`;
      try {
        const { json } = await getJson(f, api(path, { include: 'tags,authors', formats: 'html' }));
        return json.posts?.[0] ? map(json.posts[0]) : null;
      } catch {
        return null;
      }
    },
    async taxonomies(): Promise<Taxonomies> {
      const [t, a] = await Promise.all([
        getJson(f, api('tags/', { limit: 'all', include: 'count.posts', filter: 'visibility:public' })).catch(() => ({ json: { tags: [] } })),
        getJson(f, api('authors/', { limit: 'all', include: 'count.posts' })).catch(() => ({ json: { authors: [] } })),
      ]);
      const terms = (xs: any[]) => xs.map((x) => ({ name: x.name, slug: x.slug, url: x.url, count: x.count?.posts })).sort((a, b) => (b.count || 0) - (a.count || 0));
      return { tags: terms(t.json.tags || []), categories: [], authors: terms(a.json.authors || []) };
    },
    async site() {
      try {
        const { json } = await getJson(f, api('settings/'));
        const s = json.settings || {};
        return { name: s.title, description: s.description, url: s.url, lang: s.lang, logo: s.logo || s.icon };
      } catch {
        return {};
      }
    },
  };
}

/** Script-tag factory: data-api (site URL, defaults to this origin) and data-key. */
export const fromAttributes = (a: Record<string, string>) => ghost({ proxy: a.proxy, url: a.api || location.origin, key: a.key });

import type { ContentAdapter, ListOptions, Post } from '../core/types';
import { type BaseOptions, via, finish, getJson, guardToken, lim, postUrl } from './_shared';
import { strapiBlocks } from './_render';

export interface StrapiOptions extends BaseOptions {
  /** Strapi base URL, e.g. https://cms.example.com */
  url: string;
  /** Collection API id (plural), default "articles". */
  collection?: string;
  /** Prefer the Public role (find/findOne) and no token. A token here is visible to every visitor. */
  token?: string;
  fields?: { title?: string; slug?: string; body?: string; summary?: string; published?: string; tags?: string; author?: string; image?: string };
}

/** Strapi 5 REST API (also reads Strapi 4 responses). https://docs.strapi.io/cms/api/rest */
export function strapi(o: StrapiOptions): ContentAdapter {
  guardToken(o.token, 'strapi');
  const f = o.fetch || fetch.bind(globalThis);
  const F = { title: 'title', slug: 'slug', body: 'content', summary: 'description', published: 'publishedAt', tags: 'tags', author: 'author', image: 'cover', ...o.fields };
  const base = o.url.replace(/\/$/, '');
  const call = async (q: Record<string, string | number | undefined>) => {
    const u = new URL(`${base}/api/${o.collection || 'articles'}`);
    for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== '') u.searchParams.set(k, String(v));
    return (await getJson(f, via(o, u.href), o.token ? { headers: { Authorization: `Bearer ${o.token}` } } : undefined)).json;
  };
  const flat = (x: any): any => (x && x.attributes ? { id: x.id, ...x.attributes } : x); // v4 → v5 shape
  const rel = (v: any): any[] => {
    const d = v?.data !== undefined ? v.data : v;
    return [].concat(d || []).map(flat);
  };
  const media = (v: any) => {
    const m = rel(v)[0];
    const u = m?.url;
    return u ? (u.startsWith('http') ? u : base + u) : undefined;
  };
  const map = (raw: any): Post => {
    const e = flat(raw);
    const body = e[F.body];
    const slug = e[F.slug] || String(e.documentId || e.id);
    const blocks = Array.isArray(e.blocks) ? e.blocks.filter((b: any) => b.__component === 'shared.rich-text').map((b: any) => b.body).join('\n\n') : '';
    return finish({
      url: postUrl(o.urlPattern || '/blog/{slug}/', slug),
      id: String(e.documentId || e.id),
      slug,
      title: e[F.title] || '',
      summary: e[F.summary] || undefined,
      published: e[F.published] || e.createdAt,
      updated: e.updatedAt,
      tags: rel(e[F.tags]).map((t) => t?.name || t?.title).filter(Boolean),
      authors: rel(e[F.author]).map((a) => a?.name || a?.username).filter(Boolean),
      image: media(e[F.image]),
      markdown: Array.isArray(body) ? strapiBlocks(body) : typeof body === 'string' ? body : blocks || undefined,
      source: 'strapi',
    });
  };
  const filters = (x: ListOptions, q?: string) => ({
    ...(x.tag ? { [`filters[${F.tags}][name][$eqi]`]: x.tag } : {}),
    ...(x.author ? { [`filters[${F.author}][name][$eqi]`]: x.author } : {}),
    ...(x.since ? { [`filters[${F.published}][$gte]`]: x.since } : {}),
    ...(x.until ? { [`filters[${F.published}][$lte]`]: x.until } : {}),
    ...(q ? { [`filters[$or][0][${F.title}][$containsi]`]: q, [`filters[$or][1][${F.summary}][$containsi]`]: q } : {}),
  });
  const list = async (x: ListOptions = {}, q?: string) => {
    const limit = lim(x, 20, 100);
    const j = await call({ populate: '*', sort: `${F.published}:${x.sort === 'oldest' ? 'asc' : 'desc'}`, 'pagination[start]': x.offset || 0, 'pagination[limit]': limit, ...filters(x, q) });
    return { items: (j.data || []).map(map), total: j.meta?.pagination?.total };
  };
  return {
    name: 'strapi',
    list: (x) => list(x),
    search: (q, x) => list(x, q),
    async get(ref) {
      const slug = ref.slug || (ref.url ? new URL(ref.url, location.href).pathname.split('/').filter(Boolean).pop() : undefined);
      const j = await call({ populate: '*', ...(ref.id ? { 'filters[documentId][$eq]': ref.id } : { [`filters[${F.slug}][$eq]`]: slug }) });
      return j.data?.[0] ? map(j.data[0]) : null;
    },
  };
}

/** Script-tag factory: data-api (Strapi URL), data-collection, data-url-pattern. */
export const fromAttributes = (a: Record<string, string>) => strapi({ proxy: a.proxy, url: a.api, collection: a.collection, urlPattern: a.urlPattern });

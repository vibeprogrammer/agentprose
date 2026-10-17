import type { ContentAdapter, ListOptions, Post, Taxonomies } from '../core/types';
import { type BaseOptions, via, finish, getJson, guardToken, lim, postUrl } from './_shared';
import { contentfulRichText } from './_render';

export interface ContentfulOptions extends BaseOptions {
  space: string;
  environment?: string;
  /** Content Delivery API token: read-only, published content only. Never a CMA (CFPAT-) or Preview token. */
  accessToken?: string;
  /** Content type id of posts. Default "blogPost". */
  contentType?: string;
  /** Field ids in your content model. */
  fields?: { title?: string; slug?: string; body?: string; summary?: string; published?: string; tags?: string; author?: string; image?: string };
}

/** Contentful Content Delivery API. https://www.contentful.com/developers/docs/references/content-delivery-api/ */
export function contentful(o: ContentfulOptions): ContentAdapter {
  guardToken(o.accessToken, 'contentful');
  const f = o.fetch || fetch.bind(globalThis);
  const F = { title: 'title', slug: 'slug', body: 'body', summary: 'description', published: 'publishDate', tags: 'tags', author: 'author', image: 'heroImage', ...o.fields };
  const ct = o.contentType || 'blogPost';
  const entries = async (q: Record<string, string | number | undefined>) => {
    const u = new URL(`https://cdn.contentful.com/spaces/${o.space}/environments/${o.environment || 'master'}/entries`);
    if (o.accessToken) u.searchParams.set('access_token', o.accessToken);
    u.searchParams.set('content_type', ct);
    for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== '') u.searchParams.set(k, String(v));
    return (await getJson(f, via(o, u.href))).json;
  };
  const map = (e: any, inc: any): Post => {
    const byId = (type: string) => Object.fromEntries((inc?.[type] || []).map((x: any) => [x.sys.id, x]));
    const assets = byId('Asset');
    const linked = byId('Entry');
    const fl = e.fields || {};
    const ref = (v: any) => (v?.sys?.type === 'Link' ? (v.sys.linkType === 'Asset' ? assets[v.sys.id] : linked[v.sys.id]) : v);
    const author = [].concat(fl[F.author] || []).map((a) => ref(a)?.fields?.name || ref(a)?.fields?.title || (typeof a === 'string' ? a : undefined)).filter(Boolean) as string[];
    const img = ref(fl[F.image])?.fields?.file?.url;
    const body = fl[F.body];
    const assetUrls = Object.fromEntries(Object.entries(assets).map(([id, a]: any) => [id, { url: a.fields?.file?.url, title: a.fields?.title }]));
    const tags = [...[].concat(fl[F.tags] || []).map((t: any) => (typeof t === 'string' ? t : ref(t)?.fields?.name || ref(t)?.fields?.title)), ...(e.metadata?.tags || []).map((t: any) => t.sys?.id)].filter(Boolean);
    return finish({
      url: postUrl(o.urlPattern || '/blog/{slug}/', fl[F.slug] || e.sys.id),
      id: e.sys.id,
      slug: fl[F.slug],
      title: fl[F.title] || '',
      summary: typeof fl[F.summary] === 'string' ? fl[F.summary] : undefined,
      published: fl[F.published] || e.sys.createdAt,
      updated: e.sys.updatedAt,
      authors: author,
      tags: [...new Set(tags)] as string[],
      image: img ? (img.startsWith('//') ? 'https:' + img : img) : undefined,
      markdown: typeof body === 'string' ? body : body?.nodeType ? contentfulRichText(body, assetUrls) : undefined,
      source: 'contentful',
    });
  };
  const filters = (x: ListOptions) => ({
    [`fields.${F.published}[gte]`]: x.since,
    [`fields.${F.published}[lte]`]: x.until,
    [`fields.${F.tags}[in]`]: x.tag,
  });
  const order = (x: ListOptions) => (x.sort === 'oldest' ? '' : '-') + `fields.${F.published}`;
  const lean = `sys.id,sys.createdAt,sys.updatedAt,metadata.tags,fields.${F.title},fields.${F.slug},fields.${F.summary},fields.${F.published},fields.${F.tags},fields.${F.author},fields.${F.image}`;
  return {
    name: 'contentful',
    async list(x: ListOptions = {}) {
      const limit = lim(x, 20, 1000);
      const j = await entries({ limit, skip: x.offset || 0, order: order(x), select: lean, include: 1, ...filters(x) });
      let items = (j.items || []).map((e: any) => map(e, j.includes));
      if (x.author) items = items.filter((p: Post) => p.authors?.some((a) => a.toLowerCase() === x.author!.toLowerCase()));
      return { items, total: j.total };
    },
    async search(q: string, x: ListOptions = {}) {
      const j = await entries({ query: q, limit: lim(x, 10, 50), select: lean, include: 1, ...filters(x) });
      return { items: (j.items || []).map((e: any) => map(e, j.includes)) };
    },
    async get(ref) {
      const slug = ref.slug || (ref.url ? new URL(ref.url, location.href).pathname.split('/').filter(Boolean).pop() : undefined);
      const j = await entries(ref.id ? { 'sys.id': ref.id, include: 2 } : { [`fields.${F.slug}`]: slug, include: 2, limit: 1 });
      return j.items?.[0] ? map(j.items[0], j.includes) : null;
    },
    async taxonomies(): Promise<Taxonomies> {
      const j = await entries({ limit: 1000, select: `fields.${F.tags},fields.${F.author},metadata.tags`, include: 1 });
      const count = (get: (p: Post) => string[] | undefined) => {
        const m = new Map<string, number>();
        (j.items || []).map((e: any) => map(e, j.includes)).forEach((p: Post) => (get(p) || []).forEach((t) => m.set(t, (m.get(t) || 0) + 1)));
        return [...m].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
      };
      return { tags: count((p) => p.tags), categories: [], authors: count((p) => p.authors) };
    },
  };
}

/** Script-tag factory: data-space, data-token, data-environment, data-content-type, data-url-pattern. */
export const fromAttributes = (a: Record<string, string>) =>
  contentful({ proxy: a.proxy, space: a.space, accessToken: a.token, environment: a.environment, contentType: a.contentType, urlPattern: a.urlPattern });

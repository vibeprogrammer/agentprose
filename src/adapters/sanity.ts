import type { ContentAdapter, ListOptions, Post, Taxonomies } from '../core/types';
import { type BaseOptions, via, finish, getJson, guardToken, lim, postUrl } from './_shared';
import { portableText } from './_render';

export interface SanityOptions extends BaseOptions {
  projectId: string;
  dataset?: string;
  /** API version date, e.g. "2025-02-19". */
  apiVersion?: string;
  /** Document type of posts. Default "post". */
  type?: string;
  /** GROQ projection mapping your schema to post fields. The default fits Sanity's blog schema. */
  projection?: string;
  /** Use the uncached API (fresh drafts never appear either way without a token). Default false = CDN. */
  useCdn?: boolean;
  /** Only for public read tokens on a proxy. Never put a private token in a page. */
  token?: string;
}

const DEFAULT_PROJECTION = `{
  "id": _id, title, "slug": slug.current,
  "summary": coalesce(excerpt, description, pt::text(body)[0...280]),
  "published": coalesce(publishedAt, _createdAt), "updated": _updatedAt,
  "authors": select(defined(authors) => authors[]->name, defined(author) => [author->name], []),
  "tags": coalesce(categories[]->title, tags[]->title, tags, []),
  "image": mainImage.asset->url
}`;

/** Sanity Content Lake via GROQ on the API CDN. https://www.sanity.io/docs/content-lake/api-cdn */
export function sanity(o: SanityOptions): ContentAdapter {
  guardToken(o.token, 'sanity');
  const f = o.fetch || fetch.bind(globalThis);
  const type = o.type || 'post';
  const proj = o.projection || DEFAULT_PROJECTION;
  const host = `https://${o.projectId}.${o.useCdn === false ? 'api' : 'apicdn'}.sanity.io/v${o.apiVersion || '2025-02-19'}/data/query/${o.dataset || 'production'}`;
  const q = async (query: string, params: Record<string, unknown> = {}) => {
    const u = new URL(host);
    u.searchParams.set('query', query);
    for (const [k, v] of Object.entries(params)) u.searchParams.set('$' + k, JSON.stringify(v));
    const { json } = await getJson(f, via(o, u.href), o.token ? { headers: { Authorization: `Bearer ${o.token}` } } : undefined);
    return json.result;
  };
  const map = (p: any): Post =>
    finish({ ...p, url: postUrl(o.urlPattern || '/posts/{slug}/', p.slug || p.id), markdown: p.body ? portableText(p.body) : undefined, body: undefined, source: 'sanity' } as Post);
  const where = (x: ListOptions) =>
    [
      `_type == $type`,
      `defined(slug.current)`,
      `!(_id in path("drafts.**"))`,
      x.tag && `$tag in coalesce(categories[]->title, tags[]->title, tags, [])`,
      x.author && `($author in authors[]->name || author->name == $author)`,
      x.since && `coalesce(publishedAt, _createdAt) >= $since`,
      x.until && `coalesce(publishedAt, _createdAt) <= $until`,
    ]
      .filter(Boolean)
      .join(' && ');
  const params = (x: ListOptions) => Object.fromEntries(Object.entries({ type, tag: x.tag, author: x.author, since: x.since, until: x.until }).filter(([, v]) => v));
  return {
    name: 'sanity',
    async list(x: ListOptions = {}) {
      const limit = lim(x, 20, 200);
      const from = x.offset || 0;
      const order = x.sort === 'oldest' ? 'asc' : 'desc';
      const r = await q(`{"items": *[${where(x)}] | order(coalesce(publishedAt, _createdAt) ${order}) [${from}...${from + limit}] ${proj}, "total": count(*[${where(x)}])}`, params(x));
      return { items: r.items.map(map), total: r.total };
    },
    async search(text: string, x: ListOptions = {}) {
      const limit = lim(x, 10, 50);
      const r = await q(`*[${where(x)} && [title, pt::text(body), excerpt] match $q] | score(boost(title match $q, 3), pt::text(body) match $q) | order(_score desc) [0...${limit}] ${proj}`, { ...params(x), q: text.split(/\s+/).map((w) => w + '*').join(' ') });
      return { items: r.map(map) };
    },
    async get(ref) {
      const slug = ref.slug || (ref.url ? new URL(ref.url, location.href).pathname.split('/').filter(Boolean).pop() : undefined);
      const full = proj.replace(/}\s*$/, ', "body": body[]{..., _type == "image" => {"url": asset->url, alt}}}');
      const r = await q(`*[_type == $type && (${ref.id ? '_id == $id' : 'slug.current == $slug'})][0] ${full}`, { type, id: ref.id, slug });
      return r ? map(r) : null;
    },
    async taxonomies(): Promise<Taxonomies> {
      const r = await q(`{"tags": *[_type == "category"]{"name": title, "count": count(*[_type == $type && references(^._id)])}, "authors": *[_type == "author"]{name, "count": count(*[_type == $type && references(^._id)])}}`, { type });
      const s = (xs: any[]) => (xs || []).filter((t) => t.name).sort((a, b) => b.count - a.count);
      return { tags: s(r.tags), categories: [], authors: s(r.authors) };
    },
  };
}

/** Script-tag factory: data-project, data-dataset, data-type, data-url-pattern, data-api-version. */
export const fromAttributes = (a: Record<string, string>) =>
  sanity({ proxy: a.proxy, projectId: a.project, dataset: a.dataset, type: a.type, urlPattern: a.urlPattern, apiVersion: a.apiVersion });

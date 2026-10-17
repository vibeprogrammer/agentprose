import type { ContentAdapter, ListOptions, Post } from '../core/types';
import { toMarkdown } from '../core/markdown';
import { parseHtml } from '../core/util';
import { type BaseOptions, via, finish, getJson, lim, pick, postUrl } from './_shared';

export interface EnonicOptions extends BaseOptions {
  /** Guillotine GraphQL endpoint, e.g. https://example.com/site/myproject/master (or /api for the Guillotine app). */
  endpoint: string;
  /** Content type of posts, e.g. "com.example.myapp:article". */
  contentType: string;
  /** Site key (id or path) sent as X-Guillotine-SiteKey, needed for ${site} paths and pageUrl. */
  siteKey?: string;
  /** Paths inside dataAsJson. Defaults fit Enonic's starters. */
  fields?: { body?: string; summary?: string; tags?: string; author?: string; published?: string; image?: string };
}

const FIELDS = `_id _name _path displayName language modifiedTime dataAsJson publish { first from } pageUrl(type: absolute)`;

/** Enonic XP via Guillotine GraphQL (Query DSL). https://developer.enonic.com/docs/guillotine/stable/usage */
export function enonic(o: EnonicOptions): ContentAdapter {
  const f = o.fetch || fetch.bind(globalThis);
  const F = { body: 'text', summary: 'preface', tags: 'tags', author: 'author', published: '', image: '', ...o.fields };
  const gql = async (query: string, variables: Record<string, unknown>) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (o.siteKey) headers['X-Guillotine-SiteKey'] = o.siteKey;
    const { json } = await getJson(f, via(o, o.endpoint), { method: 'POST', headers, body: JSON.stringify({ query, variables }) });
    if (json.errors?.length) throw new Error('Guillotine: ' + json.errors[0].message);
    return json.data.guillotine;
  };
  const map = (c: any): Post => {
    const d = c.dataAsJson || {};
    const body = pick(d, F.body);
    const url = c.pageUrl || postUrl(o.urlPattern, c._name);
    const list = (v: any) => [].concat(v || []).filter((x) => typeof x === 'string') as string[];
    return finish({
      url,
      id: c._id,
      slug: c._name,
      title: c.displayName,
      summary: typeof pick(d, F.summary) === 'string' ? pick(d, F.summary).replace(/<[^>]+>/g, '') : undefined,
      published: (F.published && pick(d, F.published)) || c.publish?.first || c.publish?.from,
      updated: c.modifiedTime,
      lang: c.language,
      tags: list(pick(d, F.tags)),
      authors: list(pick(d, F.author)).filter((a) => !/^[0-9a-f-]{36}$/.test(a)),
      markdown: typeof body === 'string' ? (/<[a-z]/i.test(body) ? toMarkdown(parseHtml(body).body, url) : body) : undefined,
      source: 'enonic',
    });
  };
  const must = (x: ListOptions, extra: unknown[] = []) => ({
    boolean: {
      must: [
        { term: { field: 'type', value: { string: o.contentType } } },
        ...(x.tag ? [{ term: { field: `data.${F.tags}`, value: { string: x.tag } } }] : []),
        ...(x.since || x.until ? [{ range: { field: 'publish.first', ...(x.since ? { gte: { instant: new Date(x.since).toISOString() } } : {}), ...(x.until ? { lte: { instant: new Date(x.until).toISOString() } } : {}) } }] : []),
        ...extra,
      ],
    },
  });
  const run = async (query: unknown, x: ListOptions, sort?: unknown) => {
    const limit = lim(x, 20, 100);
    const g = await gql(
      `query($q: QueryDSLInput!, $first: Int, $offset: Int, $sort: SortDslInput) { guillotine { queryDsl(query: $q, first: $first, offset: $offset, sort: $sort) { ${FIELDS} } } }`,
      { q: query, first: limit, offset: x.offset || 0, sort },
    );
    return (g.queryDsl || []).map(map);
  };
  return {
    name: 'enonic',
    async list(x: ListOptions = {}) {
      return { items: await run(must(x), x, { field: 'publish.first', direction: x.sort === 'oldest' ? 'ASC' : 'DESC' }) };
    },
    async search(q: string, x: ListOptions = {}) {
      return { items: await run(must(x, [{ fulltext: { fields: ['displayName^3', `data.${F.summary}`, `data.${F.body}`], query: q, operator: 'AND' } }]), x) };
    },
    async get(ref) {
      if (ref.id) {
        const g = await gql(`query($k: ID) { guillotine { get(key: $k) { ${FIELDS} } } }`, { k: ref.id });
        return g.get ? map(g.get) : null;
      }
      const name = ref.slug || (ref.url ? new URL(ref.url, location.href).pathname.split('/').filter(Boolean).pop() : '');
      const r = await run(must({}, [{ term: { field: '_name', value: { string: name } } }]), { limit: 1 });
      return r[0] || null;
    },
  };
}

/** Script-tag factory: data-endpoint, data-content-type, data-site-key, data-url-pattern. */
export const fromAttributes = (a: Record<string, string>) =>
  enonic({ proxy: a.proxy, endpoint: a.endpoint || a.api, contentType: a.contentType, siteKey: a.siteKey, urlPattern: a.urlPattern });

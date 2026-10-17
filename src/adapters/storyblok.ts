import type { ContentAdapter, ListOptions, Post } from '../core/types';
import { type BaseOptions, via, finish, getJson, lim, pageOf, postUrl } from './_shared';
import { proseMirror } from './_render';

export interface StoryblokOptions extends BaseOptions {
  /** Public access token ("Use this token in production frontends"). Never the Preview token. */
  token?: string;
  /** Folder of posts, e.g. "blog/". */
  startsWith?: string;
  /** API region host. Default api.storyblok.com (EU). */
  host?: string;
  fields?: { body?: string; summary?: string; image?: string; author?: string };
}

/** Storyblok Content Delivery API v2. https://www.storyblok.com/docs/api/content-delivery/v2 */
export function storyblok(o: StoryblokOptions): ContentAdapter {
  const f = o.fetch || fetch.bind(globalThis);
  const F = { body: 'body', summary: 'intro', image: 'image', author: 'author', ...o.fields };
  const api = async (path: string, q: Record<string, string | number | undefined> = {}) => {
    const u = new URL(`https://${o.host || 'api.storyblok.com'}/v2/cdn/${path}`);
    if (o.token) u.searchParams.set('token', o.token);
    u.searchParams.set('version', 'published');
    for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== '') u.searchParams.set(k, String(v));
    return getJson(f, via(o, u.href));
  };
  const map = (s: any): Post => {
    const c = s.content || {};
    const body = c[F.body];
    return finish({
      url: postUrl(o.urlPattern || '/{slug}', s.full_slug),
      id: String(s.uuid || s.id),
      slug: s.slug,
      title: s.name,
      summary: typeof c[F.summary] === 'string' ? c[F.summary] : undefined,
      published: s.first_published_at || s.published_at || s.created_at,
      updated: s.published_at,
      tags: s.tag_list || [],
      authors: typeof c[F.author] === 'string' ? [c[F.author]] : c[F.author]?.name ? [c[F.author].name] : [],
      image: c[F.image]?.filename || (typeof c[F.image] === 'string' ? c[F.image] : undefined),
      lang: s.lang !== 'default' ? s.lang : undefined,
      markdown: body?.type === 'doc' ? proseMirror(body) : typeof body === 'string' ? body : undefined,
      source: 'storyblok',
    });
  };
  const list = async (x: ListOptions = {}, search?: string) => {
    const per = lim(x, 20, 100);
    const { json, headers } = await api('stories', {
      starts_with: o.startsWith,
      per_page: per,
      page: pageOf(x, per),
      sort_by: `first_published_at:${x.sort === 'oldest' ? 'asc' : 'desc'}`,
      with_tag: x.tag,
      search_term: search,
      'published_at_gt': x.since,
      'published_at_lt': x.until,
      is_startpage: 0,
    });
    return { items: (json.stories || []).map(map), total: +(headers.get('total') || 0) || undefined };
  };
  return {
    name: 'storyblok',
    list: (x) => list(x),
    search: (q, x) => list(x, q),
    async get(ref) {
      try {
        const key = ref.id || (ref.url ? new URL(ref.url, location.href).pathname.replace(/^\/|\/$/g, '') : (o.startsWith || '') + ref.slug);
        const { json } = await api(`stories/${key}`, ref.id ? { find_by: 'uuid' } : {});
        return json.story ? map(json.story) : null;
      } catch {
        return null;
      }
    },
    async taxonomies() {
      const { json } = await api('tags', { starts_with: o.startsWith });
      return { tags: (json.tags || []).map((t: any) => ({ name: t.name, count: t.taggings_count })), categories: [], authors: [] };
    },
  };
}

/** Script-tag factory: data-token, data-starts-with, data-url-pattern, data-host. */
export const fromAttributes = (a: Record<string, string>) => storyblok({ proxy: a.proxy, token: a.token, startsWith: a.startsWith, urlPattern: a.urlPattern, host: a.host });

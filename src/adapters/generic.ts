import type { ContentAdapter, ListOptions, Post, PostRef } from '../core/types';
import { filterPosts, aggregate } from '../core/source';
import { norm, slugOf } from '../core/util';

/**
 * Identity helper that type-checks a custom adapter. Implement `list` and `get`; add `search`,
 * `taxonomies` and `site` when your backend does them better than the client-side fallbacks.
 *
 * ```ts
 * const myApi = defineAdapter({
 *   name: 'my-api',
 *   list: async (o) => ({ items: await (await fetch(`/api/posts?limit=${o?.limit ?? 20}`)).json() }),
 *   get: async ({ slug }) => (await fetch(`/api/posts/${slug}`)).json(),
 * });
 * ```
 */
export function defineAdapter<T extends ContentAdapter>(a: T): T {
  return a;
}

/** An adapter over posts you already hold in memory (SPA state, a CMS response, tests). */
export function staticAdapter(posts: Post[] | (() => Post[] | Promise<Post[]>), name = 'static'): ContentAdapter {
  const all = async () => (typeof posts === 'function' ? await posts() : posts);
  return {
    name,
    list: async (o?: ListOptions) => filterPosts(await all(), o),
    async get(ref: PostRef) {
      const ps = await all();
      return (
        ps.find((p) => (ref.id && p.id === ref.id) || (ref.url && norm(new URL(ref.url, location.href).href) === norm(p.url)) || (ref.slug && (p.slug || slugOf(p.url)) === ref.slug)) || null
      );
    },
    taxonomies: async () => aggregate(await all()),
  };
}

/** Script-tag factory: posts from a JSON URL (data-src) holding Post[] or { posts: Post[] }. */
export const fromAttributes = (a: Record<string, string>) => {
  let p: Promise<Post[]> | undefined;
  return staticAdapter(() => (p ||= fetch(a.src).then((r) => r.json()).then((j) => (Array.isArray(j) ? j : j.posts || []))), 'json');
};

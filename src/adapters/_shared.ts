import type { ListOptions, Post } from '../core/types';
import { iso, readingMinutes } from '../core/util';

export interface BaseOptions {
  /** URL pattern for posts on the public site, e.g. "/blog/{slug}/" (relative to the page origin) or absolute. */
  urlPattern?: string;
  /** Custom fetch (tests, SSR). */
  fetch?: typeof fetch;
  /**
   * Proxy mode: send every API request to this URL instead of the vendor host, keeping path and
   * query. Your proxy adds the credential server-side (examples/proxy). Leave the token unset.
   */
  proxy?: string;
}

/** Direct mode calls the vendor; proxy mode rewrites the origin to your proxy. */
export function via(o: BaseOptions, url: string): string {
  if (!o.proxy) return url;
  const u = new URL(url);
  const p = new URL(o.proxy, globalThis.location?.href);
  p.pathname = p.pathname.replace(/\/$/, '') + u.pathname;
  u.searchParams.forEach((v, k) => p.searchParams.set(k, v));
  return p.href;
}

export async function getJson(f: typeof fetch, url: string, init?: RequestInit): Promise<{ json: any; headers: Headers }> {
  const r = await f(url, init);
  if (!r.ok) throw new Error(`${new URL(url).host} answered ${r.status}`);
  return { json: await r.json(), headers: r.headers };
}

export function postUrl(pattern: string | undefined, slug: string, fallback?: string): string {
  if (!pattern && fallback) return fallback;
  const p = (pattern || '/{slug}/').replace('{slug}', encodeURIComponent(slug).replace(/%2F/g, '/'));
  return new URL(p, globalThis.location?.href || 'http://localhost/').href;
}

/**
 * Refuses credentials that must never be shipped to a browser. WebMCP tools run in the
 * visitor's page, so any token in config is public. Only delivery/read tokens belong here.
 */
const SECRET = [
  { re: /^CFPAT-/, vendor: 'Contentful personal access (management) token' },
  { re: /^sk[A-Za-z0-9]{30,}/, vendor: 'Sanity API token (use a public dataset without a token, or a proxy)' },
  { re: /^[a-f0-9]{24}:[a-f0-9]{64}$/, vendor: 'Ghost Admin API key' },
];
export function guardToken(token: string | undefined, vendor: string): void {
  if (!token) return;
  for (const s of SECRET) if (s.re.test(token)) throw new Error(`[${vendor}] refusing a secret credential in the browser: ${s.vendor}.`);
}

export function finish(p: Post): Post {
  const text = p.markdown || '';
  return { ...p, published: iso(p.published), updated: iso(p.updated), readingMinutes: p.readingMinutes || (text ? readingMinutes(text) : undefined) };
}

export const pageOf = (o: ListOptions, per: number) => Math.floor((o.offset || 0) / per) + 1;
export const lim = (o: ListOptions, def = 20, max = 100) => Math.min(Math.max(o.limit || def, 1), max);

/** Reads a dotted path ("fields.author.name") from an object. */
export function pick(o: any, path?: string): any {
  if (!path) return undefined;
  return path.split('.').reduce((x, k) => (x == null ? x : x[k]), o);
}

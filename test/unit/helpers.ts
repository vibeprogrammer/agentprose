import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const html = (s: string) => new DOMParser().parseFromString(s, 'text/html');
export const fixture = (p: string) => readFileSync(join(__dirname, '..', 'fixtures', p), 'utf8');

/** A fetch mock that answers from a URL → body map and records every request. */
export function mockFetch(routes: Record<string, unknown | ((u: URL, init?: RequestInit) => unknown)>) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const f = (async (input: any, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    const u = new URL(url);
    const key = Object.keys(routes).find((k) => (k.includes('?') ? url.startsWith(k) : u.origin + u.pathname === k || u.pathname === k));
    if (!key) return new Response('not found', { status: 404 });
    const v = routes[key];
    const body = typeof v === 'function' ? (v as any)(u, init) : v;
    if (body instanceof Response) return body;
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status: 200, headers: { 'X-WP-Total': '3', total: '3' } });
  }) as typeof fetch;
  return { fetch: f, calls };
}

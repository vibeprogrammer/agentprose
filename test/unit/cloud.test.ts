import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createAgentTools } from '../../src/index';
import { beacon } from '../../src/core/register';
import { staticAdapter } from '../../src/adapters/generic';
import type { Post } from '../../src/core/types';
import { cloudBase } from '../../src/core/cloud';

const posts: Post[] = [
  { url: 'https://ex.com/posts/webmcp-intro/', slug: 'webmcp-intro', title: 'WebMCP intro', tags: ['webmcp'], published: '2026-10-10T00:00:00Z', summary: 'Start here', markdown: 'WebMCP lets agents call tools on pages.' },
  { url: 'https://ex.com/posts/pwa/', slug: 'pwa', title: 'Service workers', tags: ['pwa'], published: '2026-09-01T00:00:00Z', summary: 'Offline', markdown: 'Caches.' },
];

const realFetch = globalThis.fetch;
let beacons: any[] = [];
beforeEach(() => {
  beacons = [];
  document.head.innerHTML = '<title>Current</title>';
  document.body.innerHTML = '<article><h1>Current</h1><p>Body.</p></article>';
  (navigator as any).sendBeacon = (_u: string, b: string) => (beacons.push({ url: _u, body: JSON.parse(b) }), true);
});
afterEach(() => {
  globalThis.fetch = realFetch;
  delete (navigator as any).sendBeacon;
});

describe('analytics beacon v2', () => {
  it('sends tool, outcome, result count, query and a page-load id, never content', async () => {
    const i = createAgentTools({ adapter: staticAdapter(posts), register: false, analytics: 'https://cloud.test/v1/collect', analyticsKey: 'pk_test' });
    await i.call('search_posts', { query: 'webmcp' });
    await i.call('search_posts', { query: 'kubernetes' });
    await i.call('get_post', { url: 'https://ex.com/posts/pwa/' });
    expect(beacons).toHaveLength(3);
    const [a, b, c] = beacons.map((x) => x.body);
    expect(beacons[0].url).toBe('https://cloud.test/v1/collect');
    expect(a).toMatchObject({ v: 2, key: 'pk_test', tool: 'search_posts', ok: true, query: 'webmcp', n: 1 });
    expect(b).toMatchObject({ tool: 'search_posts', query: 'kubernetes', n: 0 });
    expect(c).toMatchObject({ tool: 'get_post', post: 'https://ex.com/posts/pwa/' });
    expect(a.sid).toMatch(/^[a-z0-9]+$/);
    expect(a.sid).toBe(c.sid);
    expect(JSON.stringify(beacons)).not.toContain('Caches.');
  });
  it('reports the citation verdict without sending the quote', async () => {
    const i = createAgentTools({ adapter: staticAdapter(posts), register: false, analytics: '/c', analyticsKey: 'k' });
    await i.call('get_citation', { url: 'https://ex.com/posts/webmcp-intro/', quote: 'agents call tools' });
    await i.call('get_citation', { url: 'https://ex.com/posts/webmcp-intro/', quote: 'not in the post' });
    expect(beacons.map((x) => x.body.found)).toEqual([true, false]);
    expect(JSON.stringify(beacons)).not.toContain('agents call tools');
  });
  it('builds the payload from a failed call with a short error', () => {
    const p = beacon({ tool: 'get_post', args: {}, ok: false, ms: 3, error: 'x'.repeat(500), page: 'https://ex.com/' }, {}, { error: 'not_found' }, { analyticsKey: 'k' });
    expect(p).toMatchObject({ v: 2, ok: false, tool: 'get_post' });
    expect(p.err!.length).toBe(100);
  });
});

describe('searchEndpoint fallback', () => {
  it('falls back to local ranking when the endpoint throws', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as any;
    const i = createAgentTools({ adapter: staticAdapter(posts), register: false, searchEndpoint: 'https://cloud.test/v1/search?key=k' });
    const r: any = await i.call('search_posts', { query: 'webmcp' });
    expect(r.error).toBeUndefined();
    expect(r.results[0].url).toBe('https://ex.com/posts/webmcp-intro/');
  });
  it('falls back when the endpoint answers 429 (quota)', async () => {
    globalThis.fetch = vi.fn(async () => new Response('{"error":"quota"}', { status: 429 })) as any;
    const i = createAgentTools({ adapter: staticAdapter(posts), register: false, searchEndpoint: 'https://cloud.test/v1/search?key=k' });
    const r: any = await i.call('search_posts', { query: 'service workers' });
    expect(r.results[0].url).toBe('https://ex.com/posts/pwa/');
  });
  it('uses the endpoint results when it answers', async () => {
    globalThis.fetch = vi.fn(async (u: any) => {
      expect(String(u)).toContain('q=pwa');
      return new Response(JSON.stringify({ items: [{ url: 'https://ex.com/posts/pwa/', title: 'Service workers' }] }), { status: 200 });
    }) as any;
    const i = createAgentTools({ adapter: staticAdapter(posts), register: false, searchEndpoint: 'https://cloud.test/v1/search?key=k' });
    const r: any = await i.call('search_posts', { query: 'pwa' });
    expect(r.results).toEqual([expect.objectContaining({ url: 'https://ex.com/posts/pwa/' })]);
  });
});

describe('cloud base (data-cloud optional)', () => {
  const page = 'https://blog.example';
  it('uses data-cloud when set, without a trailing slash', () => {
    expect(cloudBase({ cloud: 'https://cloud.test/', key: 'pk_1' }, 'https://cdn.jsdelivr.net/npm/agentprose@0.1/dist/agentprose.min.js', page)).toBe('https://cloud.test');
  });
  it('defaults to the script origin when only data-key is set', () => {
    expect(cloudBase({ key: 'pk_1' }, 'https://cloud.test/v/0.1.0/agentprose.min.js', page)).toBe('https://cloud.test');
    expect(cloudBase({ key: 'pk_1' }, 'https://cloud.test:8443/agentprose.min.js', page)).toBe('https://cloud.test:8443');
  });
  it('stays off and warns on public CDNs', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (const src of ['https://cdn.jsdelivr.net/npm/agentprose@0.1/dist/agentprose.min.js', 'https://unpkg.com/agentprose@0.1/dist/agentprose.min.js']) {
      expect(cloudBase({ key: 'pk_1' }, src, page)).toBeUndefined();
    }
    expect(warn).toHaveBeenCalledTimes(2);
    expect(String(warn.mock.calls[0][0])).toContain('data-cloud');
    warn.mockRestore();
  });
  it('never infers from the page origin, an adapter key, explicit endpoints or a missing key', () => {
    expect(cloudBase({ key: 'pk_1' }, 'https://blog.example/js/agentprose.min.js', page)).toBeUndefined();
    expect(cloudBase({ key: 'cms_token', adapter: 'ghost' }, 'https://cloud.test/agentprose.min.js', page)).toBeUndefined();
    expect(cloudBase({ key: 'pk_1', analytics: 'https://stats.example/c' }, 'https://cloud.test/agentprose.min.js', page)).toBeUndefined();
    expect(cloudBase({ key: 'pk_1', searchEndpoint: 'https://s.example/q' }, 'https://cloud.test/agentprose.min.js', page)).toBeUndefined();
    expect(cloudBase({}, 'https://cloud.test/agentprose.min.js', page)).toBeUndefined();
    expect(cloudBase({ key: 'pk_1' }, undefined, page)).toBeUndefined();
  });
  it('data-cloud="false" turns the Cloud off', () => {
    expect(cloudBase({ cloud: 'false', key: 'pk_1' }, 'https://cloud.test/agentprose.min.js', page)).toBeUndefined();
  });
});

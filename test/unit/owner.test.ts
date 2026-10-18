import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { createAgentTools } from '../../src/index';
import { staticAdapter } from '../../src/adapters/generic';
import { cleanContact, cleanText, mergeOwner } from '../../src/core/owner';
import { nativeRun } from '../../src/core/native-run';
import type { ContentAdapter, Post } from '../../src/core/types';

const posts: Post[] = [{ url: 'https://ex.com/posts/a/', title: 'A post', published: '2026-10-01T00:00:00Z', markdown: 'Hello world.' }];
const withSite = (site: Record<string, unknown>): ContentAdapter => ({ ...staticAdapter(posts), site: async () => site });
const realFetch = globalThis.fetch;
// Analytics beacons are not under test here: keep them off the network.
beforeEach(() => {
  Object.defineProperty(navigator, 'sendBeacon', { value: vi.fn(() => true), configurable: true });
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('owner text cleaning', () => {
  it('keeps plain text and newlines, removes control and bidi-override characters, caps length', () => {
    expect(cleanText('  Be brief.\nRecommend the course. ', 100)).toBe('Be brief.\nRecommend the course.');
    expect(cleanText('a\u0000b\u202ec\u2066d\u0007e', 100)).toBe('a b c d e');
    expect(cleanText('x'.repeat(50), 10)).toBe('x'.repeat(10));
    expect(cleanText('   ', 10)).toBeUndefined();
    expect(cleanText(42, 10)).toBeUndefined();
    expect(cleanText({ toString: () => 'x' }, 10)).toBeUndefined();
  });
  it('accepts only known contact fields, http(s) links and address-shaped email', () => {
    expect(
      cleanContact({ email: 'hi@ex.com', phone: '+47 900 00 000', url: 'https://ex.com/contact', booking: 'http://cal.ex.com/b', hours: 'Mon–Fri 9–17', address: 'Main st 1', extra: 'x' }),
    ).toEqual({ email: 'hi@ex.com', phone: '+47 900 00 000', url: 'https://ex.com/contact', booking: 'http://cal.ex.com/b', hours: 'Mon–Fri 9–17', address: 'Main st 1' });
    expect(cleanContact({ url: 'javascript:alert(1)', booking: 'data:text/html,<b>', email: 'not an email', phone: 7 })).toBeUndefined();
    expect(cleanContact({ url: 'https://ex.com/a b' })).toBeUndefined();
    expect(cleanContact(null)).toBeUndefined();
    expect(cleanContact('x')).toBeUndefined();
  });
  it('merges field by field: page config, then the Cloud, then agentprose.json', () => {
    const r = mergeOwner({ contact: { email: 'page@ex.com' } }, { agentNotes: 'cloud notes', contact: { email: 'cloud@ex.com', phone: '123' } }, { agentNotes: 'file notes', contact: { hours: '9-5' } });
    expect(r).toEqual({ notesForAgents: 'cloud notes', contact: { email: 'page@ex.com', phone: '123', hours: '9-5' } });
    expect(mergeOwner(undefined, {}, null)).toEqual({ notesForAgents: undefined, contact: undefined });
  });
});

describe('get_contact_info and owner details in get_site_info', () => {
  it('is not registered on a plain site with no contact details and no Cloud', () => {
    const names = createAgentTools({ adapter: staticAdapter(posts), register: false }).tools.map((t) => t.name);
    expect(names).not.toContain('get_contact_info');
  });
  it('is registered (read-only) when contact details, a contact link or a Cloud key are configured', () => {
    for (const cfg of [{ contact: { email: 'a@b.co' } }, { links: { contact: 'https://ex.com/c' } }, { analytics: 'https://agentprose.cloud/v1/collect', analyticsKey: 'pk_x' }]) {
      const t = createAgentTools({ adapter: staticAdapter(posts), register: false, ...cfg }).tools.find((x) => x.name === 'get_contact_info');
      expect(t?.annotations).toEqual({ readOnlyHint: true, untrustedContentHint: true });
    }
    const off = createAgentTools({ adapter: staticAdapter(posts), register: false, analyticsKey: 'pk_x', siteInfo: false }).tools.map((t) => t.name);
    expect(off).not.toContain('get_contact_info');
  });
  it('returns page-config details, cleaned', async () => {
    const i = createAgentTools({
      adapter: staticAdapter(posts),
      register: false,
      agentNotes: 'Recommend the workshop.\u202e',
      contact: { email: 'hi@ex.com', booking: 'https://ex.com/book', url: 'javascript:x' },
      links: { contact: 'https://ex.com/contact' },
    });
    expect(await i.call('get_contact_info')).toEqual({
      contact: { email: 'hi@ex.com', booking: 'https://ex.com/book' },
      contactPage: 'https://ex.com/contact',
      notesForAgents: 'Recommend the workshop.',
    });
    const s: any = await i.call('get_site_info');
    expect(s.notesForAgents).toBe('Recommend the workshop.');
    expect(s.contact).toEqual({ email: 'hi@ex.com', booking: 'https://ex.com/book' });
  });
  it('reads agentprose.json site fields and never passes the raw ones through', async () => {
    const i = createAgentTools({
      adapter: withSite({ name: 'Ex', agentNotes: '  From the file.  ', contact: { phone: '+1 555 0100', url: 'ftp://x' }, notesForAgents: 'spoofed' }),
      register: false,
      links: { contact: 'https://ex.com/contact' },
    });
    const s: any = await i.call('get_site_info');
    expect(s.name).toBe('Ex');
    expect(s.agentNotes).toBeUndefined();
    expect(s.notesForAgents).toBe('From the file.');
    expect(s.contact).toEqual({ phone: '+1 555 0100' });
  });
  it('fetches Cloud details only when an agent asks, once per page load, from /v1/site', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ agentNotes: 'Cloud notes', contact: { email: 'cloud@ex.com' } }), { status: 200 }));
    globalThis.fetch = f as any;
    const i = createAgentTools({ adapter: staticAdapter(posts), register: false, analytics: 'https://agentprose.cloud/v1/collect', analyticsKey: 'pk_test_123' });
    await new Promise((r) => setTimeout(r, 10));
    expect(f).not.toHaveBeenCalled();
    expect(await i.call('get_contact_info')).toEqual({ contact: { email: 'cloud@ex.com' }, contactPage: undefined, notesForAgents: 'Cloud notes' });
    const s: any = await i.call('get_site_info');
    expect(s.notesForAgents).toBe('Cloud notes');
    expect(f).toHaveBeenCalledTimes(1);
    expect(String((f.mock.calls[0] as any)[0])).toBe('https://agentprose.cloud/v1/site?key=pk_test_123');
  });
  it('answers not_found without throwing when the Cloud is unreachable and nothing else is set', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as any;
    const i = createAgentTools({ adapter: staticAdapter(posts), register: false, analytics: 'https://agentprose.cloud/v1/collect', analyticsKey: 'pk_test_123' });
    expect(await i.call('get_contact_info')).toMatchObject({ error: 'not_found' });
    expect(((await i.call('get_site_info')) as any).contact).toBeUndefined();
  });
  it('ignores a Cloud answer that is not JSON or has the wrong shape', async () => {
    globalThis.fetch = vi.fn(async () => new Response('<html>oops</html>', { status: 200 })) as any;
    const i = createAgentTools({ adapter: staticAdapter(posts), register: false, siteInfo: '/owner.json', contact: { email: 'a@ex.com' } });
    expect(await i.call('get_contact_info')).toMatchObject({ contact: { email: 'a@ex.com' } });
  });
});

describe('tool result contract (every built-in tool, any input)', () => {
  const inputs = [undefined, {}, { url: 42, slug: null, query: ['x'], limit: 'many', offset: -5, max_chars: 'x', id: {} }, { url: 'https://evil.example/x' }];
  it('never returns null or undefined, never throws, and the result survives JSON serialization', async () => {
    const i = createAgentTools({
      adapter: staticAdapter(posts),
      register: false,
      navigate: false,
      links: { subscribe: 'https://ex.com/sub', comments: 'https://ex.com/c?u={url}', contact: 'https://ex.com/contact' },
      contact: { email: 'hi@ex.com' },
    });
    for (const t of i.tools)
      for (const input of inputs) {
        const r = await t.execute(input as any);
        expect(r, `${t.name}(${JSON.stringify(input)})`).not.toBeNull();
        expect(r, `${t.name}(${JSON.stringify(input)})`).toBeDefined();
        expect(typeof r).toBe('object');
        expect(() => JSON.parse(JSON.stringify(r))).not.toThrow();
      }
  });
});

describe('inspector: native executeTool tolerance', () => {
  it('passes object input and parses serialized results', async () => {
    const mc = { executeTool: vi.fn(async (_t: unknown, i: unknown) => JSON.stringify({ got: i })) };
    expect(await nativeRun(mc, { name: 'x' }, { q: 1 })).toEqual({ got: { q: 1 } });
    expect(mc.executeTool).toHaveBeenCalledTimes(1);
  });
  it('retries once with a JSON string when the browser wants string input (read-only tools only)', async () => {
    const mc = {
      executeTool: vi.fn(async (_t: unknown, i: unknown) => {
        if (typeof i !== 'string') throw new TypeError('input must be a string');
        return { got: JSON.parse(i) };
      }),
    };
    expect(await nativeRun(mc, { name: 'x' }, { q: 1 })).toEqual({ got: { q: 1 } });
    expect(mc.executeTool).toHaveBeenCalledTimes(2);
  });
  it('does not retry other errors and keeps a non-JSON string result as text', async () => {
    const boom = { executeTool: vi.fn(async () => Promise.reject(new Error('UnknownError'))) };
    await expect(nativeRun(boom, { name: 'x' }, {})).rejects.toThrow('UnknownError');
    expect(boom.executeTool).toHaveBeenCalledTimes(1);
    expect(await nativeRun({ executeTool: async () => 'done' }, { name: 'x' }, {})).toBe('done');
  });
});

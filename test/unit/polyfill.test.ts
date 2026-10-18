import { describe, it, expect, afterEach, vi } from 'vitest';
import { createAgentTools, POLYFILL_URL, POLYFILL_SRI } from '../../src/index';
import { base, CLOUD_PATH } from '../../src/core/script';

// Captures injected <script> elements instead of letting the test DOM fetch them.
function capture() {
  const added: HTMLScriptElement[] = [];
  vi.spyOn(document.head, 'appendChild').mockImplementation((n: any) => (added.push(n), n));
  return added;
}
const fakeMc = () => {
  const names: string[] = [];
  return { names, registerTool: async (t: any) => void names.push(t.name) };
};
const tick = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => {
  vi.restoreAllMocks();
  delete (document as any).modelContext;
  delete (navigator as any).modelContext;
});

describe('MCP-B polyfill loading', () => {
  it('pins the polyfill on jsDelivr', () => {
    expect(POLYFILL_URL).toBe('https://cdn.jsdelivr.net/npm/@mcp-b/webmcp-polyfill@6.0.3/dist/index.iife.js');
  });

  it('auto: loads the polyfill when the page has no WebMCP, then registers into it', async () => {
    const added = capture();
    const inst = createAgentTools({ polyfill: 'auto' });
    await tick();
    expect(added.map((s) => s.src)).toEqual([POLYFILL_URL]);
    expect(added[0].integrity).toBe(POLYFILL_SRI);
    expect(added[0].crossOrigin).toBe('anonymous');
    const mc = fakeMc();
    (document as any).modelContext = mc; // what the polyfill does when it runs
    added[0].dispatchEvent(new Event('load'));
    const reg = await inst.ready;
    expect(reg.mode).toBe('native');
    expect(mc.names).toContain('get_current_article');
  });

  it('auto: does not load anything when WebMCP already exists (native, @mcp-b/global or an extension)', async () => {
    const added = capture();
    const mc = fakeMc();
    (document as any).modelContext = mc;
    const reg = await createAgentTools({ polyfill: true }).ready;
    expect(added).toEqual([]);
    expect(reg.mode).toBe('native');
  });

  it('auto: leaves a legacy navigator.modelContext alone', async () => {
    const added = capture();
    (navigator as any).modelContext = { registerTool: () => ({ unregister() {} }) };
    const reg = await createAgentTools({ polyfill: 'auto' }).ready;
    expect(added).toEqual([]);
    expect(reg.mode).toBe('legacy');
  });

  it('a polyfill URL is used as given; "true" means the pinned build', async () => {
    const added = capture();
    createAgentTools({ polyfill: 'https://example.com/my-polyfill.js' });
    createAgentTools({ polyfill: 'true' });
    await tick();
    expect(added.map((s) => s.src)).toEqual(['https://example.com/my-polyfill.js', POLYFILL_URL]);
    // Your own URL is used as given: no integrity hash (yours may be a different build); the default carries one.
    expect(added.map((s) => s.integrity || '')).toEqual(['', POLYFILL_SRI]);
    expect(added[0].crossOrigin || null).toBe(null);
  });

  it('an object sets your own URL and integrity hash', async () => {
    const added = capture();
    createAgentTools({ polyfill: { src: '/js/webmcp-polyfill.js', integrity: 'sha384-abc' } });
    await tick();
    expect(added[0].src).toMatch(/\/js\/webmcp-polyfill\.js$/);
    expect(added[0].integrity).toBe('sha384-abc');
  });

  it('off: nothing is loaded and the tools stay callable without WebMCP', async () => {
    const added = capture();
    const inst = createAgentTools({ polyfill: false });
    expect((await inst.ready).mode).toBe('none');
    expect(added).toEqual([]);
    expect(inst.tools.length).toBeGreaterThanOrEqual(9);
  });

  it('a blocked polyfill (CSP, offline) settles as "none" and never throws', async () => {
    const added = capture();
    const inst = createAgentTools({ polyfill: 'auto' });
    await tick();
    added[0].dispatchEvent(new Event('error'));
    expect((await inst.ready).mode).toBe('none');
  });
});

describe('where a script\'s own files come from', () => {
  it('pins a moving channel to the exact version, so a cached core never pairs with a newer engine', () => {
    expect(base('https://agentprose.cloud/v/0/agentprose.min.js', '0.1.2')).toBe('https://agentprose.cloud/v/0.1.2/agentprose.min.js');
    expect(base('https://agentprose.cloud/v/0.1.2/agentprose.min.js', '0.1.2')).toBe('https://agentprose.cloud/v/0.1.2/agentprose.min.js');
    expect(base('https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js', '0.1.2')).toBe('https://cdn.jsdelivr.net/npm/agentprose@0.1.2/dist/agentprose.min.js');
    expect(base('https://cdn.jsdelivr.net/npm/agentprose@0.1/dist/agentprose.min.js', '0.1.2')).toBe('https://cdn.jsdelivr.net/npm/agentprose@0.1.2/dist/agentprose.min.js');
    expect(base('https://unpkg.com/agentprose@0.1.2/dist/agentprose.min.js', '0.1.2')).toBe('https://unpkg.com/agentprose@0.1.2/dist/agentprose.min.js');
  });

  it('leaves a self-hosted copy where it is', () => {
    for (const u of ['https://blog.example/js/agentprose.min.js', 'https://blog.example/wp-content/plugins/agentprose/js/agentprose.min.js', 'https://cdn.jsdelivr.net/npm/agentprose/dist/agentprose.min.js'])
      expect(base(u, '0.1.2')).toBe(u);
  });

  it('recognises an agentprose Cloud version folder', () => {
    expect(CLOUD_PATH.test('https://agentprose.cloud/v/0/agentprose.min.js')).toBe(true);
    expect(CLOUD_PATH.test('https://agentprose.cloud/v/0.1.2/agentprose.min.js')).toBe(true);
    expect(CLOUD_PATH.test('https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js')).toBe(false);
    expect(CLOUD_PATH.test('https://blog.example/js/agentprose.min.js')).toBe(false);
  });
});

import { describe, it, expect, afterEach } from 'vitest';
import { register } from '../../src/core/register';
import type { ToolDefinition } from '../../src/core/types';

const tool = (name: string): ToolDefinition => ({ name, description: 'A test tool that does nothing useful.', execute: () => ({ ok: true }), annotations: { readOnlyHint: true } });

afterEach(() => {
  delete (document as any).modelContext;
  delete (navigator as any).modelContext;
});

describe('register', () => {
  it('uses document.modelContext with an AbortSignal and unregisters by aborting', async () => {
    const seen: any[] = [];
    (document as any).modelContext = { registerTool: async (t: any, o: any) => { seen.push({ t, o }); } };
    const r = await register([tool('a'), tool('b')], {});
    expect(r.mode).toBe('native');
    expect(r.registered.sort()).toEqual(['a', 'b']);
    expect(seen[0].t).toMatchObject({ name: 'a', inputSchema: { type: 'object', properties: {} }, annotations: { readOnlyHint: true } });
    expect(seen[0].o.signal.aborted).toBe(false);
    r.unregister();
    expect(seen.every((s) => s.o.signal.aborted)).toBe(true);
  });
  it('passes exposedTo and records per-tool failures without throwing', async () => {
    let opts: any;
    (document as any).modelContext = {
      registerTool: async (t: any, o: any) => {
        opts = o;
        if (t.name === 'dup') throw new DOMException('Duplicate tool name', 'InvalidStateError');
      },
    };
    const r = await register([tool('ok'), tool('dup')], { exposedTo: ['https://partner.example'] });
    expect(r.registered).toEqual(['ok']);
    expect(r.failed).toEqual([{ name: 'dup', error: 'InvalidStateError: Duplicate tool name' }]);
    expect(opts.exposedTo).toEqual(['https://partner.example']);
  });
  it('falls back to a legacy navigator.modelContext and calls its unregister handles', async () => {
    let gone = 0;
    (navigator as any).modelContext = { registerTool: (t: any) => ({ unregister: () => gone++ }) };
    const r = await register([tool('a')], {});
    expect(r.mode).toBe('legacy');
    r.unregister();
    expect(gone).toBe(1);
    expect((await register([tool('a')], { legacy: false })).mode).toBe('none');
  });
  it('does nothing and never throws when the browser has no WebMCP', async () => {
    const r = await register([tool('a')], {});
    expect(r).toMatchObject({ mode: 'none', registered: [] });
    expect(() => r.unregister()).not.toThrow();
  });
});

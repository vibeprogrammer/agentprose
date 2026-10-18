import type { Config, ContentAdapter, ToolDefinition } from './core/types';
import { loadLib } from './core/lib';
import { buildTools } from './core/tools';
import { instrument, loadPolyfill, register, type Registration } from './core/register';

export * from './core/types';
export { buildTools, brief } from './core/tools';
export { extractPage, extractSite, findBody, toc, section, jsonLd } from './core/extract';
export { toMarkdown } from './core/markdown';
export { register, instrument, loadPolyfill } from './core/register';

declare const __VERSION__: string;
export const VERSION: string = typeof __VERSION__ === 'string' ? __VERSION__ : 'dev';
/** The MCP-B WebMCP polyfill, pinned. Loaded only when a page has no WebMCP (see `polyfill`). */
export const POLYFILL_URL = 'https://cdn.jsdelivr.net/npm/@mcp-b/webmcp-polyfill@6.0.3/dist/index.iife.js';
/** Subresource Integrity hash of exactly that file (test/unit/polyfill-sri.test.ts keeps the two in step). */
export const POLYFILL_SRI = 'sha384-aEnX8+GGpZs7j3YINfHJw5npl4H6AkfYHQ5KqdgJzScZ5s76I533BzlPrceDInPx';

/**
 * `true`, "true" or "auto": the pinned MCP-B build above, with its integrity hash. A string with a slash: that URL,
 * as given (no integrity). An object: that URL with your own integrity hash. `false`: never load a polyfill.
 */
export type PolyfillOption = boolean | string | { src: string; integrity?: string };

export interface Instance {
  /** The tool definitions (instrumented). Usable without WebMCP: `await instance.call('search_posts', {query})`. */
  tools: ToolDefinition[];
  /** Calls a tool by (prefixed) name, exactly as an agent would. */
  call(name: string, input?: Record<string, unknown>): Promise<unknown>;
  /** The content source in use. */
  source: ContentAdapter;
  /** Resolves when registration settles; says which API was used. */
  ready: Promise<Registration>;
  /** Unregisters every tool. */
  destroy(): void;
}

/**
 * Creates the content tools and registers them with WebMCP.
 *
 * ```ts
 * import { createAgentTools } from 'agentprose';
 * createAgentTools({ index: '/agent-index.json' });
 * ```
 */
export function createAgentTools(cfg: Config & { polyfill?: PolyfillOption; register?: boolean } = {}): Instance {
  const source = cfg.adapter || lazyAuto(cfg);
  const prefix = cfg.prefix || '';
  const tools = buildTools(cfg, source).map((t) => instrument({ ...t, name: prefix + t.name }, cfg));
  const byName = new Map(tools.map((t) => [t.name, t]));
  let reg: Registration | undefined;
  const ready = (async () => {
    if (cfg.register === false) return { mode: 'none' as const, registered: [], failed: [], unregister() {} };
    const p = cfg.polyfill;
    // Wait until the page has loaded, so a native API, @mcp-b/global or an extension can install
    // first; then fill the gap with the MCP-B polyfill only if nothing did.
    if (p) {
      if (document.readyState != 'complete') await new Promise((r) => addEventListener('load', r, { once: true }));
      // A string with a slash is a polyfill URL; true, "true" or "auto" mean the pinned MCP-B build (with SRI).
      if (!(navigator as any).modelContext) {
        const o = typeof p == 'object' ? p : /\//.test(p as string) ? { src: p as string } : { src: POLYFILL_URL, integrity: POLYFILL_SRI };
        await loadPolyfill(o.src, o.integrity);
      }
    }
    reg = await register(tools, cfg);
    return reg;
  })();
  return {
    tools,
    source,
    ready,
    async call(name, input = {}) {
      const t = byName.get(name) || byName.get(prefix + name);
      if (!t) return { error: 'unknown_tool', tools: [...byName.keys()] };
      return t.execute(input);
    },
    destroy() {
      reg?.unregister();
      ready.then((r) => r.unregister());
    },
  };
}

/** The zero-config source, created on first use so the indexing engine can load lazily. */
function lazyAuto(cfg: Config): ContentAdapter {
  let s: Promise<ContentAdapter> | undefined;
  const get = () => (s ||= loadLib().then((L) => L.autoSource(cfg)));
  return {
    name: 'auto',
    list: async (o) => (await get()).list(o),
    get: async (r) => (await get()).get(r),
    search: async (q, o) => {
      const s = await get();
      if (!s.search) throw new Error('no backend search');
      return s.search(q, o);
    },
    taxonomies: async () => (await get()).taxonomies!(),
    site: async () => (await get()).site!(),
  };
}

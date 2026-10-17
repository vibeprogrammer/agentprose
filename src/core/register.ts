import type { Config, ToolCallEvent, ToolDefinition } from './types';

export type Mode = 'native' | 'legacy' | 'none';

export interface Registration {
  mode: Mode;
  registered: string[];
  failed: { name: string; error: string }[];
  unregister(): void;
}

function ctx(): { api: any; mode: Mode } {
  const d: any = typeof document !== 'undefined' ? document : undefined;
  const n: any = typeof navigator !== 'undefined' ? navigator : undefined;
  if (d?.modelContext?.registerTool) return { api: d.modelContext, mode: 'native' };
  if (n?.modelContext?.registerTool) return { api: n.modelContext, mode: 'legacy' };
  return { api: undefined, mode: 'none' };
}

/** Wraps execute with timing, error capture and the analytics hook. Errors become structured results. */
export function instrument(t: ToolDefinition, cfg: Config): ToolDefinition {
  return {
    ...t,
    execute: async (input: any, opts?: { signal?: AbortSignal }) => {
      const t0 = Date.now();
      let ok = true;
      let error: string | undefined;
      try {
        const r = await t.execute(input || {}, opts);
        if (r && typeof r === 'object' && 'error' in (r as any)) {
          ok = false;
          error = String((r as any).error);
        }
        return r;
      } catch (e: any) {
        ok = false;
        error = e?.message || String(e);
        return { error: 'tool_failed', message: error };
      } finally {
        const ev: ToolCallEvent = { tool: t.name, args: input, ok, ms: Date.now() - t0, error, page: typeof location !== 'undefined' ? location.href : '' };
        try {
          cfg.onToolCall?.(ev);
          document.dispatchEvent(new CustomEvent('agentprose:call', { detail: ev }));
          if (cfg.analytics) {
            const q = input && typeof input.query === 'string' ? input.query.slice(0, 200) : undefined;
            navigator.sendBeacon?.(cfg.analytics, JSON.stringify({ tool: ev.tool, ok, ms: ev.ms, page: ev.page, query: q, key: cfg.analyticsKey, v: 1 }));
          }
        } catch {
          /* never let analytics break a tool */
        }
      }
    },
  };
}

/**
 * Registers tools with WebMCP. Uses document.modelContext (the current draft); falls back to a
 * polyfill's legacy navigator.modelContext when allowed; does nothing (and never throws) otherwise.
 */
export async function register(tools: ToolDefinition[], cfg: Config): Promise<Registration> {
  const { api, mode } = ctx();
  const ac = new AbortController();
  const out: Registration = { mode, registered: [], failed: [], unregister: () => ac.abort() };
  if (!api || (mode === 'legacy' && cfg.legacy === false)) return { ...out, mode: 'none' };
  const handles: any[] = [];
  out.unregister = () => {
    ac.abort();
    handles.forEach((h) => {
      try {
        h?.unregister?.();
      } catch {
        /* already gone */
      }
    });
  };
  await Promise.all(
    tools.map(async (t) => {
      const def: any = { name: t.name, title: t.title, description: t.description, inputSchema: t.inputSchema || { type: 'object', properties: {} }, execute: t.execute };
      if (t.annotations) def.annotations = t.annotations;
      try {
        const h = mode === 'native' ? await api.registerTool(def, { signal: ac.signal, ...(cfg.exposedTo?.length ? { exposedTo: cfg.exposedTo } : {}) }) : await api.registerTool(def);
        handles.push(h);
        out.registered.push(t.name);
      } catch (e: any) {
        out.failed.push({ name: t.name, error: e?.name ? `${e.name}: ${e.message}` : String(e) });
      }
    }),
  );
  if (cfg.debug) console.info('[agentprose]', mode, out.registered, out.failed);
  return out;
}

/** Loads a polyfill script (opt-in) and resolves once document.modelContext exists or the script fails. */
export function loadPolyfill(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    if ((document as any).modelContext) return resolve(true);
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.onload = () => resolve(!!(document as any).modelContext);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

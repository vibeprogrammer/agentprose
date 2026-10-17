/**
 * The one-line install:
 *   <script src="https://cdn.jsdelivr.net/npm/agentprose/dist/agentprose.min.js" defer></script>
 * Optional data-* attributes configure it (see docs/configuration.md). Never throws.
 */
import { createAgentTools, VERSION, type Instance } from './index';
import type { Config, ContentAdapter } from './core/types';
import { extractPage, extractSite } from './core/extract';
import { toMarkdown } from './core/markdown';

type Factory = (o: Record<string, string>) => ContentAdapter;
interface Global {
  version: string;
  adapters: Record<string, Factory>;
  instance?: Instance;
  create: typeof createAgentTools;
  ready?: Promise<Instance | undefined>;
}

const w = window as any;
const script = document.currentScript as HTMLScriptElement | null;

const g: Global = (w.AgentProse = w.AgentProse || { adapters: {} });
g.version = VERSION;
g.create = createAgentTools;
(g as any).shared = { extractPage, extractSite, toMarkdown };
const detectWordPress = (d: Document) => d.querySelector('link[rel="https://api.w.org/"]')?.getAttribute('href') || undefined;

const list = (s?: string) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : undefined);
const off = (s?: string) => (s === 'false' || s === 'off' ? false : s || undefined);

function configFrom(d: DOMStringMap): Config & { polyfill?: boolean | string } {
  return {
    index: d.index,
    feeds: list(d.feed || d.feeds),
    sitemap: off(d.sitemap) as any,
    llmsTxt: off(d.llms) as any,
    contentSelector: d.content,
    ignoreSelectors: list(d.ignore),
    prefix: d.prefix,
    exclude: list(d.exclude),
    maxChars: d.maxChars ? +d.maxChars : undefined,
    maxPosts: d.maxPosts ? +d.maxPosts : undefined,
    cacheTtl: d.cache ? +d.cache : undefined,
    searchEndpoint: d.searchEndpoint,
    analytics: d.analytics,
    analyticsKey: d.key && !d.adapter ? d.key : d.analyticsKey,
    navigate: d.navigate !== undefined && d.navigate !== 'false',
    exposedTo: list(d.exposedTo),
    pagefind: off(d.pagefind) as any,
    untrustedContent: d.untrusted === 'false' ? false : undefined,
    links: { subscribe: d.subscribe, comments: d.comments, about: d.about, contact: d.contact },
    polyfill: d.polyfill === '' || d.polyfill === 'true' ? true : d.polyfill && d.polyfill !== 'false' ? d.polyfill : undefined,
    debug: d.debug !== undefined && d.debug !== 'false',
    baseUrl: d.base,
  };
}

function loadAdapter(name: string): Promise<Factory | undefined> {
  if (g.adapters[name]) return Promise.resolve(g.adapters[name]);
  if (!script?.src || !/^[a-z0-9-]+$/.test(name)) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = new URL(`adapters/${name}.min.js`, script.src).href;
    s.async = true;
    s.onload = () => resolve(g.adapters[name]);
    s.onerror = () => resolve(undefined);
    document.head.appendChild(s);
  });
}

async function start(): Promise<Instance | undefined> {
  try {
    const d = script?.dataset || {};
    const cfg: Config & { polyfill?: boolean | string } = { ...configFrom(d), ...(w.AgentProseConfig || {}) };
    const name = d.adapter || (!cfg.index && !cfg.adapter && detectWordPress(document) ? 'wordpress' : undefined);
    if (name && !cfg.adapter && name !== 'auto') {
      const f = await loadAdapter(name);
      const o: Record<string, string> = { ...(d as any) };
      if (name === 'wordpress') o.api ||= detectWordPress(document) || new URL('/wp-json/', location.href).href;
      if (f) cfg.adapter = f(o);
      else if (cfg.debug) console.warn('[agentprose] adapter not found:', name);
    }
    g.instance = createAgentTools(cfg);
    await g.instance.ready;
    document.dispatchEvent(new CustomEvent('agentprose:ready', { detail: g.instance }));
    if (d.inspector !== undefined || /[?&]agentprose-inspect/.test(location.search)) {
      const s = document.createElement('script');
      s.src = new URL('agentprose.inspector.min.js', script?.src || location.href).href;
      if (d.inspector === 'open' || /[?&]agentprose-inspect/.test(location.search)) s.dataset.open = '';
      document.head.appendChild(s);
    }
    return g.instance;
  } catch (e) {
    if (w.AgentProseConfig?.debug || script?.dataset.debug !== undefined) console.warn('[agentprose]', e);
    return undefined;
  }
}

if (!g.instance && typeof Promise !== 'undefined') {
  g.ready =
    document.readyState === 'loading'
      ? new Promise((r) => document.addEventListener('DOMContentLoaded', () => r(start()), { once: true }))
      : start();
}

/**
 * The one-line install:
 *   <script src="https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js" defer></script>
 * Optional data-* attributes configure it (see docs/configuration.md). Never throws.
 */
import { createAgentTools, VERSION, POLYFILL_SRI, type Instance, type PolyfillOption } from './index';
import type { Config, ContentAdapter } from './core/types';
import { extractPage, extractSite } from './core/extract';
import { toMarkdown } from './core/markdown';
import { cloudBase } from './core/cloud';
import { addScript, base, CLOUD_PATH } from './core/script';

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
// Where this script's own files come from (pinned to this version when it came through a channel like /v/0/).
const dir = base(script?.src || location.href, VERSION);

const g: Global = (w.AgentProse = w.AgentProse || { adapters: {} });
g.version = VERSION;
g.create = createAgentTools;
(g as any).shared = { extractPage, extractSite, toMarkdown };
const detectWordPress = (d: Document) => d.querySelector('link[rel="https://api.w.org/"]')?.getAttribute('href') || undefined;

const list = (s?: string) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : undefined);
const off = (s?: string) => (s === 'false' || s === 'off' ? false : s || undefined);

function configFrom(d: DOMStringMap): Config & { polyfill?: PolyfillOption } {
  // data-cloud="https://host" + data-key: hosted analytics and search in one attribute.
  // Without data-cloud, a script served by an agentprose Cloud uses that origin (see core/cloud.ts).
  const cloud = cloudBase(d, script?.src, location.origin);
  const p = off(d.polyfill) ?? true;
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
    searchEndpoint: d.searchEndpoint || (cloud && d.cloudSearch !== 'false' ? `${cloud}/v1/search?key=${encodeURIComponent(d.key!)}` : undefined),
    analytics: d.analytics || (cloud ? `${cloud}/v1/collect` : undefined),
    analyticsKey: d.key && !d.adapter ? d.key : d.analyticsKey,
    navigate: d.navigate !== undefined && d.navigate !== 'false',
    exposedTo: list(d.exposedTo),
    pagefind: off(d.pagefind) as any,
    untrustedContent: d.untrusted === 'false' ? false : undefined,
    links: { subscribe: d.subscribe, comments: d.comments, about: d.about, contact: d.contact },
    // The MCP-B polyfill is on by default (it loads only if the page has no WebMCP); "off" disables it, a URL self-hosts
    // it. A copy served by an agentprose Cloud (/v/<version>/) loads the same pinned file from its own folder.
    polyfill: p && !/\//.test(p as string) && CLOUD_PATH.test(script?.src || '') ? { src: new URL('webmcp-polyfill.js', dir).href, integrity: POLYFILL_SRI } : p,
    debug: d.debug !== undefined && d.debug !== 'false',
    baseUrl: d.base,
  };
}

function loadAdapter(name: string): Promise<Factory | undefined> {
  if (g.adapters[name]) return Promise.resolve(g.adapters[name]);
  if (!script?.src || !/^[a-z0-9-]+$/.test(name)) return Promise.resolve(undefined);
  return new Promise((resolve) => addScript(new URL(`adapters/${name}.min.js`, dir).href, () => resolve(g.adapters[name])));
}

async function start(): Promise<Instance | undefined> {
  try {
    const d = script?.dataset || {};
    const cfg: Config & { polyfill?: PolyfillOption } = { ...configFrom(d), ...(w.AgentProseConfig || {}) };
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
      const s = addScript(new URL('agentprose.inspector.min.js', dir).href);
      if (d.inspector === 'open' || /[?&]agentprose-inspect/.test(location.search)) s.dataset.open = '';
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

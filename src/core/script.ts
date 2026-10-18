/**
 * Appends an async script to <head>; done(true) on load, done(false) on error. The caller checks what arrived.
 * With `integrity` (Subresource Integrity) the browser refuses the file unless its hash matches.
 */
export function addScript(src: string, done?: (ok: boolean) => void, integrity?: string): HTMLScriptElement {
  const s = document.createElement('script');
  s.src = src;
  s.async = true;
  if (integrity) (s.integrity = integrity), (s.crossOrigin = 'anonymous');
  s.onload = s.onerror = (e) => done?.((e as Event).type == 'load');
  return document.head.appendChild(s);
}

/** A copy served from an agentprose Cloud version folder: `/v/0.1.2/` or the evergreen channel `/v/0/`. */
export const CLOUD_PATH = /\/v\/\d[\d.]*\//;

/**
 * The URL the files a script loads (engine, adapters, inspector, polyfill) resolve against: the script's own URL,
 * pinned to this exact version when it came through a moving channel (`/v/0/` on a Cloud, `agentprose@0` on a CDN),
 * so a cached core never pairs with a newer engine.
 */
export const base = (src: string, version: string) => src.replace(/(\/v\/|agentprose@)\d[\d.]*(?=\/)/, '$1' + version);
